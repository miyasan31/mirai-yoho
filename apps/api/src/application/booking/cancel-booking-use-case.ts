import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { BookingCancelledEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
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
    private readonly userCouponRepository: IUserCouponRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly userContactService: IUserContactService,
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

    const occupiedSlotIds = booking.getAllOccupiedSlotIds();
    const occupiedSlots = (
      await Promise.all(
        occupiedSlotIds.map((slotId) =>
          this.slotRepository.findById(input.organizationId, slotId),
        ),
      )
    ).filter((s): s is NonNullable<typeof s> => s !== null);
    for (const slot of occupiedSlots) {
      if (!slot.getIsAvailable()) {
        slot.release();
      }
    }

    const sessionDate = ZoomSession.sessionDateFromInstant(
      booking.getStartsAt(),
    );
    const session = await this.zoomSessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );
    if (session) {
      session.removeBooking(input.bookingId);
      await this.zoomService.updateBreakoutRooms({
        meetingId: session.getZoomMeetingId(),
        breakoutRooms: session.getBreakoutRooms().map((r) => ({
          name: r.getRoomName(),
          participants: [r.getCustomerEmail()],
        })),
      });
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
      ...occupiedSlots.map((slot) => this.slotRepository.save(slot)),
      ...(session ? [this.zoomSessionRepository.save(session)] : []),
      ...(restoredCoupon?.getRedeemedAt() === undefined && restoredCoupon
        ? [this.userCouponRepository.save(restoredCoupon)]
        : []),
    ]);

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingCancelled") {
        await this.sendCancellationEmail(
          input.organizationId,
          event as BookingCancelledEvent,
          booking.getStartsAt(),
        );
      }
    }
  }

  // 予約はキャンセル済みで永続化まで終わっているため、メール送信の失敗で
  // 呼び出し元を失敗させない（ログに残して続行する）。
  private async sendCancellationEmail(
    organizationId: string,
    event: BookingCancelledEvent,
    startsAt: Date,
  ): Promise<void> {
    try {
      const [customer, consultant, contacts] = await Promise.all([
        this.customerRepository.findById(
          organizationId,
          event.payload.customerId,
        ),
        this.consultantRepository.findById(
          organizationId,
          event.payload.consultantId,
        ),
        this.userContactService.findByUids([event.payload.consultantId]),
      ]);

      const customerName = customer?.getName() ?? "";
      const consultantName = consultant?.getProfile().getDisplayName() ?? "";

      const customerEmail = customer?.getEmail() ?? "";
      if (customerEmail) {
        await this.emailService.sendBookingCancellation({
          customerEmail,
          customerName,
          consultantName,
          bookingId: event.payload.bookingId,
          cancelledBy: event.payload.cancelledBy,
        });
      } else {
        // 退会済み顧客は mask() でメールアドレスが空になる
        console.warn("Skipped booking cancellation email: no customer email", {
          organizationId,
          bookingId: event.payload.bookingId,
          customerId: event.payload.customerId,
        });
      }

      // 担当占い師へのキャンセル通知（PRD §3.7）
      const consultantEmail = contacts.get(event.payload.consultantId)?.email;
      if (consultantEmail) {
        await this.emailService.sendConsultantCancellationNotice({
          consultantEmail,
          consultantName,
          customerName,
          startsAt,
          bookingId: event.payload.bookingId,
          cancelledBy: event.payload.cancelledBy,
        });
      }
    } catch (error) {
      console.error("Failed to send booking cancellation email", {
        organizationId,
        bookingId: event.payload.bookingId,
        error,
      });
    }
  }
}
