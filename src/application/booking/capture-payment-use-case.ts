import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { CaptureMethod } from "@/domain/payment/payment";
import type { PaymentCapturedEvent } from "@/domain/payment/payment-events";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface CapturePaymentInput {
  bookingId: string;
  method: CaptureMethod;
}

export class CapturePaymentUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly clientRepository: IClientRepository,
    private readonly stripeService: IStripeService,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CapturePaymentInput): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const payment = await this.paymentRepository.findByBookingId(
      input.bookingId,
    );
    if (!payment) {
      throw new Error("Payment not found");
    }

    const client = await this.clientRepository.findById(booking.getClientId());
    if (!client) {
      throw new Error("Client not found");
    }

    await this.stripeService.capturePaymentIntent(
      payment.getStripePaymentIntentId(),
    );
    payment.capture(input.method);
    booking.complete();

    await Promise.all([
      this.bookingRepository.save(booking),
      this.paymentRepository.save(payment),
    ]);

    const events = payment.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "PaymentCaptured") {
        const e = event as PaymentCapturedEvent;
        await this.emailService.sendPaymentReceipt({
          clientEmail: client.getEmail(),
          clientName: client.getName(),
          amountJPY: e.payload.amountJPY,
          bookingId: e.payload.bookingId,
        });
      }
    }
  }
}
