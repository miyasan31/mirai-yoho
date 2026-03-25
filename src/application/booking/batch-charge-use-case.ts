import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
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
    clientRepository: IClientRepository,
    stripeService: IStripeService,
    emailService: IEmailService,
  ) {
    this.chargeUseCase = new ChargePaymentUseCase(
      bookingRepository,
      paymentRepository,
      clientRepository,
      stripeService,
      emailService,
    );
  }

  async execute(): Promise<BatchChargeResult> {
    const confirmedBookings =
      await this.bookingRepository.findByStatus("confirmed");

    const now = new Date();
    const eligibleBookings = confirmedBookings.filter(
      (booking) => booking.getStartDatetime() < now,
    );

    let chargedCount = 0;
    let completedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of eligibleBookings) {
      try {
        const payment = await this.paymentRepository.findByBookingId(
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
