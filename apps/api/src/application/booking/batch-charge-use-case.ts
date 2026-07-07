import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface BatchChargeResult {
  chargedCount: number;
  completedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export class BatchChargeUseCase {
  private readonly chargeUseCase: ChargePaymentUseCase;

  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    customerRepository: ICustomerRepository,
    stripeService: IStripeService,
    emailService: IEmailService,
  ) {
    this.chargeUseCase = new ChargePaymentUseCase(
      bookingRepository,
      paymentRepository,
      customerRepository,
      stripeService,
      emailService,
    );
  }

  async execute(organizationId: string): Promise<BatchChargeResult> {
    const confirmedBookings = await this.bookingRepository.findByStatus(
      organizationId,
      "confirmed",
    );

    const now = new Date();
    const eligibleBookings = confirmedBookings.filter(
      (booking) => booking.getStartsAt() < now,
    );

    let chargedCount = 0;
    let completedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of eligibleBookings) {
      try {
        const payment = await this.paymentRepository.findByBookingId(
          organizationId,
          booking.getBookingId(),
        );
        if (!payment) {
          errors.push({
            bookingId: booking.getBookingId(),
            error: "Payment not found",
          });
          continue;
        }

        const strategy = payment.getPaymentStrategy();
        const status = payment.getStatus().getValue();

        if (strategy.isDeferred() && status === "setup_complete") {
          await this.chargeUseCase.execute({
            organizationId,
            bookingId: booking.getBookingId(),
            method: "batch",
          });
          chargedCount++;
        } else if (strategy.isImmediate() && status === "charged") {
          booking.complete();
          await this.bookingRepository.save(booking);
          completedCount++;
        }
      } catch (error) {
        errors.push({
          bookingId: booking.getBookingId(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { chargedCount, completedCount, errors };
  }
}
