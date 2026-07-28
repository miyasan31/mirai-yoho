import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IAccountRepository } from "@/domain/account/account-repository";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

const SYSTEM_ADMIN_ROLE_ID = "admin";

interface BatchChargeResult {
  chargedCount: number;
  completedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

type ProcessOutcome =
  | { kind: "charged" }
  | { kind: "completed" }
  | { kind: "skipped" }
  | { kind: "error"; error: string };

export class BatchChargeUseCase {
  private readonly chargeUseCase: ChargePaymentUseCase;

  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly customerRepository: ICustomerRepository,
    stripeService: IStripeService,
    private readonly emailService: IEmailService,
    private readonly accountRepository: IAccountRepository,
    private readonly userContactService: IUserContactService,
    private readonly consoleAppUrl: string,
  ) {
    this.chargeUseCase = new ChargePaymentUseCase(
      bookingRepository,
      paymentRepository,
      customerRepository,
      stripeService,
      emailService,
    );
  }

  /**
   * バッチ実行結果を組織の管理者（roleId: admin）へ通知する（PRD §3.7）。
   * 課金処理自体は完了しているため、失敗してもログに残して続行する。
   */
  private async reportToAdmins(
    organizationId: string,
    startedAt: Date,
    result: BatchChargeResult,
  ): Promise<void> {
    try {
      const accounts =
        await this.accountRepository.findByOrganizationId(organizationId);
      const adminAccountIds = accounts
        .filter(
          (account) =>
            account.getRoleId() === SYSTEM_ADMIN_ROLE_ID &&
            account.getStatus() === "active",
        )
        .map((account) => account.getAccountId());

      if (adminAccountIds.length === 0) {
        return;
      }

      const contacts =
        await this.userContactService.findByUids(adminAccountIds);
      const adminEmails = adminAccountIds
        .map((accountId) => contacts.get(accountId)?.email)
        .filter((email): email is string => Boolean(email));

      if (adminEmails.length === 0) {
        return;
      }

      await this.emailService.sendBatchChargeReport({
        adminEmails,
        organizationId,
        startedAt,
        chargedCount: result.chargedCount,
        completedCount: result.completedCount,
        errors: result.errors,
        consoleBookingsUrl: `${this.consoleAppUrl.replace(/\/$/, "")}/${organizationId}/bookings`,
      });
    } catch (error) {
      console.error("Failed to send batch charge report", {
        organizationId,
        error,
      });
    }
  }

  async execute(organizationId: string): Promise<BatchChargeResult> {
    const startedAt = new Date();
    const confirmedBookings = await this.bookingRepository.findByStatus(
      organizationId,
      "confirmed",
    );

    const now = startedAt;
    const eligibleBookings = confirmedBookings.filter(
      (booking) => booking.getStartsAt() < now,
    );

    if (eligibleBookings.length === 0) {
      // 対象 0 件のときは通知しない（毎日 0 時に空のメールが飛ぶのを避ける）
      return { chargedCount: 0, completedCount: 0, errors: [] };
    }

    const customerIds = eligibleBookings.map((booking) =>
      booking.getCustomerId(),
    );
    const [allPayments, customers] = await Promise.all([
      this.paymentRepository.findAll(organizationId),
      this.customerRepository.findByIds(organizationId, customerIds),
    ]);
    const paymentByBookingId = new Map(
      allPayments.map((payment) => [payment.getBookingId(), payment] as const),
    );
    const customerById = new Map(
      customers.map(
        (customer) => [customer.getCustomerId(), customer] as const,
      ),
    );

    const outcomes = await Promise.all(
      eligibleBookings.map(async (booking): Promise<ProcessOutcome> => {
        const payment = paymentByBookingId.get(booking.getBookingId()) ?? null;
        if (!payment) {
          return { kind: "error", error: "Payment not found" };
        }

        const strategy = payment.getPaymentStrategy();
        const status = payment.getStatus().getValue();

        try {
          if (strategy.isDeferred() && status === "setup_complete") {
            const customer = customerById.get(booking.getCustomerId());
            if (!customer) {
              return { kind: "error", error: "Customer not found" };
            }
            await this.chargeUseCase.execute({
              organizationId,
              bookingId: booking.getBookingId(),
              method: "batch",
              preloaded: { booking, payment, customer },
            });
            return { kind: "charged" };
          }
          if (strategy.isImmediate() && status === "charged") {
            booking.complete();
            await this.bookingRepository.save(booking);
            return { kind: "completed" };
          }
          return { kind: "skipped" };
        } catch (error) {
          return {
            kind: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    let chargedCount = 0;
    let completedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];
    outcomes.forEach((outcome, index) => {
      const booking = eligibleBookings[index];
      if (outcome.kind === "charged") chargedCount++;
      else if (outcome.kind === "completed") completedCount++;
      else if (outcome.kind === "error") {
        errors.push({
          bookingId: booking.getBookingId(),
          error: outcome.error,
        });
      }
    });

    const result = { chargedCount, completedCount, errors };
    await this.reportToAdmins(organizationId, startedAt, result);
    return result;
  }
}
