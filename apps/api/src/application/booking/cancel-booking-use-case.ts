import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
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
  noShow?: boolean;
  now?: Date;
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

    const now = input.now ?? new Date();
    const fee = booking.cancel({
      cancelledBy: input.cancelledBy,
      now,
      noShow: input.noShow,
    });

    const payment = await this.paymentRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );
    if (payment) {
      const strategy = payment.getPaymentStrategy();
      const status = payment.getStatus().getValue();

      if (strategy.isImmediate() && status === "charged") {
        if (fee.isFull()) {
          // 当日キャンセル or no-show は返金しない（そのまま課金を維持）
        } else {
          const paymentIntentId = payment.getStripePaymentIntentId();
          if (paymentIntentId) {
            await this.stripeService.refundPaymentIntent(paymentIntentId);
          }
          payment.refund();
        }
      } else if (strategy.isDeferred()) {
        if (status === "setup_complete" && fee.isFull()) {
          const paymentMethodId = payment.getStripePaymentMethodId();
          if (paymentMethodId) {
            const { paymentIntentId } =
              await this.stripeService.createOffSessionPaymentIntent({
                amountJPY: fee.getAmountJPY(),
                paymentMethodId,
                metadata: {
                  bookingId: booking.getBookingId(),
                  organizationId: booking.getOrganizationId(),
                  chargeType: "cancellation-fee",
                },
              });
            payment.charge(paymentIntentId, "cancellation");
          }
        } else if (status === "setup_pending" || status === "setup_complete") {
          payment.cancel();
        }
      }
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
    const customerEmail = customer?.getEmail() ?? "";
    if (!customerEmail) {
      return;
    }
    for (const event of events) {
      if (event.eventName === "BookingCancelled") {
        const e = event as BookingCancelledEvent;
        await this.emailService.sendBookingCancellation({
          customerEmail,
          customerName: customer?.getName() ?? "",
          consultantName: consultant?.getProfile().getDisplayName() ?? "",
          bookingId: e.payload.bookingId,
          cancelledBy: e.payload.cancelledBy,
          cancellationFeeJPY: e.payload.cancellationFeeJPY,
          noShow: e.payload.noShow,
        });
      }
    }
  }
}
