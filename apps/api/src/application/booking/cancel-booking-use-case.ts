import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { BookingCancelledEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

interface CancelBookingInput {
  organizationId: string;
  bookingId: string;
  cancelledBy: "customer" | "admin";
}

export class CancelBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly slotRepository: ISlotRepository,
    private readonly stripeService: IStripeService,
    private readonly emailService: IEmailService,
    private readonly zoomSessionRepository: IZoomSessionRepository,
    private readonly zoomService: IZoomService,
    private readonly customerRepository: ICustomerRepository,
    private readonly userCouponRepository: IUserCouponRepository,
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

    const sessionDate = ZoomSession.sessionDateFromInstant(
      booking.getStartsAt(),
    );
    const session = await this.zoomSessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );
    if (session) {
      const customer = await this.customerRepository.findById(
        input.organizationId,
        booking.getCustomerId(),
      );
      if (customer) {
        session.removeParticipant(customer.getEmail());
        await this.zoomService.updateBreakoutRooms({
          meetingId: session.getZoomMeetingId(),
          breakoutRooms: session.getBreakoutRooms().map((r) => ({
            name: r.getRoomName(),
            participants: [...r.getParticipantEmails()],
          })),
        });
      }
    }

    // 適用中のクーポンを未使用状態に戻す（キャンセル時のクーポン戻し）
    const appliedUserCouponId = booking.getAppliedUserCouponId();
    const restoredCoupon = appliedUserCouponId
      ? await this.userCouponRepository.findById(appliedUserCouponId)
      : null;
    if (restoredCoupon?.getRedeemedBookingId() === booking.getBookingId()) {
      restoredCoupon.restore();
    }

    await Promise.all([
      this.bookingRepository.save(booking),
      ...(payment ? [this.paymentRepository.save(payment)] : []),
      ...(slot ? [this.slotRepository.save(slot)] : []),
      ...(session ? [this.zoomSessionRepository.save(session)] : []),
      ...(restoredCoupon?.getRedeemedAt() === undefined && restoredCoupon
        ? [this.userCouponRepository.save(restoredCoupon)]
        : []),
    ]);

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingCancelled") {
        const e = event as BookingCancelledEvent;
        await this.emailService.sendBookingCancellation({
          customerEmail: "",
          customerName: "",
          consultantName: "",
          bookingId: e.payload.bookingId,
          cancelledBy: e.payload.cancelledBy,
        });
      }
    }
  }
}
