import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { BookingCancelledEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";

interface CancelBookingInput {
  organizationId: string;
  bookingId: string;
  cancelledBy: "client" | "admin";
}

function toSessionDate(date: Date): string {
  return date
    .toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

export class CancelBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly slotRepository: ISlotRepository,
    private readonly stripeService: IStripeService,
    private readonly emailService: IEmailService,
    private readonly zoomDailySessionRepository: IZoomDailySessionRepository,
    private readonly zoomService: IZoomService,
    private readonly clientRepository: IClientRepository,
  ) {}

  async execute(input: CancelBookingInput): Promise<void> {
    const booking = await this.bookingRepository.findById(
      input.organizationId,
      input.bookingId,
    );
    if (!booking) {
      throw new Error("Booking not found");
    }

    booking.cancel(input.cancelledBy);

    const payment = await this.paymentRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );
    if (payment) {
      const strategy = payment.getPaymentStrategy();
      const status = payment.getStatus().getValue();

      if (strategy.isImmediate() && status === "charged") {
        const paymentIntentId = payment.getStripePaymentIntentId();
        if (paymentIntentId) {
          await this.stripeService.refundPaymentIntent(paymentIntentId);
        }
        payment.refund();
      } else if (
        strategy.isDeferred() &&
        (status === "setup_pending" || status === "setup_complete")
      ) {
        payment.cancel();
      }
    }

    const slot = await this.slotRepository.findById(
      input.organizationId,
      booking.getSlotId(),
    );
    if (slot) {
      slot.release();
    }

    const sessionDate = toSessionDate(booking.getStartDatetime());
    const session = await this.zoomDailySessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );
    if (session) {
      const client = await this.clientRepository.findById(
        input.organizationId,
        booking.getClientId(),
      );
      if (client) {
        session.removeParticipant(client.getEmail());
        await this.zoomService.updateBreakoutRooms({
          meetingId: session.getZoomMeetingId(),
          breakoutRooms: session.getBreakoutRooms().map((r) => ({
            name: r.getRoomName(),
            participants: [...r.getParticipantEmails()],
          })),
        });
      }
    }

    await Promise.all([
      this.bookingRepository.save(booking),
      ...(payment ? [this.paymentRepository.save(payment)] : []),
      ...(slot ? [this.slotRepository.save(slot)] : []),
      ...(session ? [this.zoomDailySessionRepository.save(session)] : []),
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
