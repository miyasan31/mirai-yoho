import { CapturePaymentUseCase } from "@/application/booking/capture-payment-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface BatchCaptureResult {
  capturedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export class BatchCaptureUseCase {
  private readonly captureUseCase: CapturePaymentUseCase;

  constructor(
    private readonly bookingRepository: IBookingRepository,
    paymentRepository: IPaymentRepository,
    clientRepository: IClientRepository,
    stripeService: IStripeService,
    emailService: IEmailService,
  ) {
    this.captureUseCase = new CapturePaymentUseCase(
      bookingRepository,
      paymentRepository,
      clientRepository,
      stripeService,
      emailService,
    );
  }

  async execute(): Promise<BatchCaptureResult> {
    const confirmedBookings =
      await this.bookingRepository.findByStatus("confirmed");

    const now = new Date();
    const eligibleBookings = confirmedBookings.filter(
      (booking) => booking.getStartDatetime() < now,
    );

    let capturedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of eligibleBookings) {
      try {
        await this.captureUseCase.execute({
          bookingId: booking.getBookingId(),
          method: "batch",
        });
        capturedCount++;
      } catch (error) {
        errors.push({
          bookingId: booking.getBookingId(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { capturedCount, errors };
  }
}
