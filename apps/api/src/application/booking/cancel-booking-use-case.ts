import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { BookingCancelledEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { CancellationCategory } from "@/domain/booking/cancellation-category";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

interface CancelBookingInput {
  organizationId: string;
  bookingId: string;
  cancelledBy: "customer" | "admin";
  categoryOverride?: "no_show";
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
    private readonly consultantRepository: IConsultantRepository,
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

    const [customer, consultant] = await Promise.all([
      this.customerRepository.findById(
        input.organizationId,
        booking.getCustomerId(),
      ),
      this.consultantRepository.findById(
        input.organizationId,
        booking.getConsultantId(),
      ),
    ]);

    const now = new Date();
    const category =
      input.categoryOverride === "no_show"
        ? CancellationCategory.noShow()
        : CancellationCategory.forTime(booking.getStartsAt(), now);
    const bookingTotalJPY = booking.getEffectiveTotalJPY() ?? 0;
    const cancellationFeeJPY = category.computeFeeJPY(bookingTotalJPY);
    const refundJPY = Math.max(0, bookingTotalJPY - cancellationFeeJPY);

    booking.cancel({
      cancelledBy: input.cancelledBy,
      category,
      at: now,
    });

    const payment = await this.paymentRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );
    if (payment) {
      await this.applyPaymentPolicy({
        payment,
        refundJPY,
        cancellationFeeJPY,
        organizationId: input.organizationId,
        bookingId: input.bookingId,
      });
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
    if (session && customer) {
      session.removeParticipant(customer.getEmail());
      await this.zoomService.updateBreakoutRooms({
        meetingId: session.getZoomMeetingId(),
        breakoutRooms: session.getBreakoutRooms().map((r) => ({
          name: r.getRoomName(),
          participants: [...r.getParticipantEmails()],
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
        const e = event as BookingCancelledEvent;
        if (!customer) {
          continue;
        }
        await this.emailService.sendBookingCancellation({
          customerEmail: customer.getEmail(),
          customerName: customer.getName(),
          consultantName: consultant?.getProfile().getDisplayName() ?? "",
          bookingId: e.payload.bookingId,
          cancelledBy: e.payload.cancelledBy,
          startsAt: e.payload.startsAt,
          cancellationCategory: e.payload.cancellationCategory,
          cancellationFeeJPY: e.payload.cancellationFeeJPY,
          refundJPY: e.payload.refundJPY,
        });
      }
    }
  }

  private async applyPaymentPolicy(params: {
    payment: Payment;
    refundJPY: number;
    cancellationFeeJPY: number;
    organizationId: string;
    bookingId: string;
  }): Promise<void> {
    const { payment, refundJPY, cancellationFeeJPY } = params;
    const strategy = payment.getPaymentStrategy();
    const status = payment.getStatus().getValue();

    if (strategy.isImmediate() && status === "charged") {
      if (refundJPY <= 0) {
        return;
      }
      const paymentIntentId = payment.getStripePaymentIntentId();
      const totalJPY = payment.getMoney().getTotalJPY();
      if (paymentIntentId) {
        const isFullRefund = refundJPY >= totalJPY;
        await this.stripeService.refundPaymentIntent(
          paymentIntentId,
          isFullRefund ? undefined : refundJPY,
        );
      }
      payment.refund();
      return;
    }

    if (
      strategy.isDeferred() &&
      (status === "setup_pending" || status === "setup_complete")
    ) {
      if (cancellationFeeJPY <= 0) {
        payment.cancel();
        return;
      }
      const paymentMethodId = payment.getStripePaymentMethodId();
      if (status !== "setup_complete" || !paymentMethodId) {
        // カード情報未確定のためキャンセル料を回収できない。setup を破棄する。
        payment.cancel();
        return;
      }
      const { paymentIntentId } =
        await this.stripeService.createOffSessionPaymentIntent({
          amountJPY: cancellationFeeJPY,
          paymentMethodId,
          metadata: {
            organizationId: params.organizationId,
            bookingId: params.bookingId,
            purpose: "cancellation_fee",
          },
        });
      payment.charge(paymentIntentId, "batch");
    }
  }
}
