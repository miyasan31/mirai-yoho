import type { BookingCancelledEvent } from "@/domain/booking/bookingEvents";
import type { IBookingRepository } from "@/domain/booking/iBookingRepository";
import type { IPaymentRepository } from "@/domain/payment/iPaymentRepository";
import type { ISlotRepository } from "@/domain/slot/iSlotRepository";
import type { IEmailService } from "@/application/shared/iEmailService";
import type { IStripeService } from "@/application/shared/iStripeService";

interface CancelBookingInput {
  bookingId: string;
  cancelledBy: "client" | "admin";
}

export class CancelBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly slotRepository: ISlotRepository,
    private readonly stripeService: IStripeService,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: CancelBookingInput): Promise<void> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    booking.cancel(input.cancelledBy);

    const payment = await this.paymentRepository.findByBookingId(
      input.bookingId,
    );
    if (payment) {
      await this.stripeService.cancelPaymentIntent(
        payment.getStripePaymentIntentId(),
      );
      payment.cancel();
    }

    const slot = await this.slotRepository.findById(booking.getSlotId());
    if (slot) {
      slot.release();
    }

    await Promise.all([
      this.bookingRepository.save(booking),
      ...(payment ? [this.paymentRepository.save(payment)] : []),
      ...(slot ? [this.slotRepository.save(slot)] : []),
    ]);

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingCancelled") {
        const e = event as BookingCancelledEvent;
        await this.emailService.sendBookingCancellation({
          clientEmail: "",
          clientName: "",
          consultantName: "",
          bookingId: e.payload.bookingId,
          cancelledBy: e.payload.cancelledBy,
        });
      }
    }
  }
}
