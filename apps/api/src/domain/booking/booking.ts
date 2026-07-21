import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { SupportedDurationMinutes } from "@mirai-yoho/shared/slot-availability";
import {
  BookingCancelledEvent,
  BookingConfirmedEvent,
} from "@/domain/booking/booking-events";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { CancellationFee } from "@/domain/booking/cancellation-fee";
import type { ConsultantMemo } from "@/domain/booking/consultant-memo";
import type { ZoomUrl } from "@/domain/booking/zoom-url";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type CancelledBy = "customer" | "admin";

export interface CancelParams {
  cancelledBy: CancelledBy;
  now?: Date;
  noShow?: boolean;
}

interface AppliedCoupon {
  userCouponId: string;
  discountJPY: number;
}

interface BookingCreateProps {
  organizationId: string;
  bookingId: string;
  customerId: string;
  consultantId: string;
  usageSlotIds: string[];
  bufferSlotIds: string[];
  startsAt: Date;
  endsAt: Date;
  durationMinutes: SupportedDurationMinutes;
  consultantMemo: ConsultantMemo;
  consultationContent?: string;
  pricePlanId: string;
  pricePlanName: string;
  pricePlanTotalJPY: number;
  appliedCoupon?: AppliedCoupon;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingProps
  extends Omit<
    BookingCreateProps,
    "pricePlanId" | "pricePlanName" | "pricePlanTotalJPY" | "appliedCoupon"
  > {
  status: BookingStatus;
  cancelDeadlineAt: CancelDeadline;
  joinUrl?: ZoomUrl;
  consultantJoinedAt?: Date;
  consultationReminderEmailSentAt?: Date;
  pricePlanId?: string;
  pricePlanName?: string;
  pricePlanTotalJPY?: number;
  appliedUserCouponId?: string;
  couponDiscountJPY?: number;
  discountedTotalJPY?: number;
  lateArrivalAlertSentAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: CancelledBy;
  cancellationFee?: CancellationFee;
  noShow?: boolean;
}

export class Booking extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly bookingId: string,
    private readonly customerId: string,
    private readonly consultantId: string,
    private readonly usageSlotIds: readonly string[],
    private readonly bufferSlotIds: readonly string[],
    private readonly startsAt: Date,
    private readonly endsAt: Date,
    private readonly durationMinutes: SupportedDurationMinutes,
    private status: BookingStatus,
    private readonly cancelDeadlineAt: CancelDeadline,
    private joinUrl: ZoomUrl | undefined,
    private consultantJoinedAt: Date | undefined,
    private consultationReminderEmailSentAt: Date | undefined,
    private lateArrivalAlertSentAt: Date | undefined,
    private consultantMemo: ConsultantMemo,
    private consultationContent: string | undefined,
    private readonly pricePlanId: string | undefined,
    private readonly pricePlanName: string | undefined,
    private readonly pricePlanTotalJPY: number | undefined,
    private readonly appliedUserCouponId: string | undefined,
    private readonly couponDiscountJPY: number | undefined,
    private readonly discountedTotalJPY: number | undefined,
    private cancelledAt: Date | undefined,
    private cancelledBy: CancelledBy | undefined,
    private cancellationFee: CancellationFee | undefined,
    private noShow: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: BookingCreateProps): Booking {
    if (props.usageSlotIds.length === 0) {
      throw new DomainError(
        "BOOKING_MISSING_USAGE_SLOTS",
        "Booking must reference at least one usage slot",
      );
    }
    const now = new Date();
    const appliedUserCouponId = props.appliedCoupon?.userCouponId;
    const couponDiscountJPY = props.appliedCoupon?.discountJPY;
    const discountedTotalJPY =
      couponDiscountJPY !== undefined
        ? Math.max(0, props.pricePlanTotalJPY - couponDiscountJPY)
        : undefined;
    return new Booking(
      props.organizationId,
      props.bookingId,
      props.customerId,
      props.consultantId,
      [...props.usageSlotIds],
      [...props.bufferSlotIds],
      props.startsAt,
      props.endsAt,
      props.durationMinutes,
      BookingStatus.create("pending"),
      CancelDeadline.create(props.startsAt),
      undefined,
      undefined,
      undefined,
      undefined,
      props.consultantMemo,
      props.consultationContent,
      props.pricePlanId,
      props.pricePlanName,
      props.pricePlanTotalJPY,
      appliedUserCouponId,
      couponDiscountJPY,
      discountedTotalJPY,
      undefined,
      undefined,
      undefined,
      false,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: BookingProps): Booking {
    const createdAt = props.createdAt ?? new Date(0);
    return new Booking(
      props.organizationId,
      props.bookingId,
      props.customerId,
      props.consultantId,
      [...props.usageSlotIds],
      [...props.bufferSlotIds],
      props.startsAt,
      props.endsAt,
      props.durationMinutes,
      props.status,
      props.cancelDeadlineAt,
      props.joinUrl,
      props.consultantJoinedAt,
      props.consultationReminderEmailSentAt,
      props.lateArrivalAlertSentAt,
      props.consultantMemo,
      props.consultationContent,
      props.pricePlanId,
      props.pricePlanName,
      props.pricePlanTotalJPY,
      props.appliedUserCouponId,
      props.couponDiscountJPY,
      props.discountedTotalJPY,
      props.cancelledAt,
      props.cancelledBy,
      props.cancellationFee,
      props.noShow ?? false,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  confirm(joinUrl: ZoomUrl): void {
    if (this.status.getValue() !== "pending") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending bookings can be confirmed",
      );
    }
    this.status = BookingStatus.reconstruct("confirmed");
    this.joinUrl = joinUrl;
    this.updatedAt = new Date();
    this.addDomainEvent(
      BookingConfirmedEvent.create({
        bookingId: this.bookingId,
        customerId: this.customerId,
        consultantId: this.consultantId,
        joinUrl: joinUrl.getValue(),
        startsAt: this.startsAt,
        endsAt: this.endsAt,
      }),
    );
  }

  cancel(params: CancelParams): CancellationFee {
    const currentStatus = this.status.getValue();
    if (currentStatus !== "pending" && currentStatus !== "confirmed") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending or confirmed bookings can be cancelled",
      );
    }

    const now = params.now ?? new Date();
    const noShow = params.noShow ?? false;
    const fee = this.determineCancellationFee(params.cancelledBy, now, noShow);

    this.status = BookingStatus.reconstruct("cancelled");
    this.cancelledAt = now;
    this.cancelledBy = params.cancelledBy;
    this.cancellationFee = fee;
    this.noShow = noShow;
    this.updatedAt = now;
    this.addDomainEvent(
      BookingCancelledEvent.create({
        bookingId: this.bookingId,
        customerId: this.customerId,
        consultantId: this.consultantId,
        cancelledBy: params.cancelledBy,
        cancellationFeeJPY: fee.getAmountJPY(),
        noShow,
      }),
    );
    return fee;
  }

  private determineCancellationFee(
    cancelledBy: CancelledBy,
    now: Date,
    noShow: boolean,
  ): CancellationFee {
    const total = this.getEffectiveTotalJPY() ?? 0;
    if (noShow) {
      return CancellationFee.full(total);
    }
    if (cancelledBy === "admin") {
      return CancellationFee.none();
    }
    if (this.cancelDeadlineAt.isExpired(now)) {
      return CancellationFee.full(total);
    }
    return CancellationFee.none();
  }

  complete(): void {
    if (this.status.getValue() !== "confirmed") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only confirmed bookings can be completed",
      );
    }
    this.status = BookingStatus.reconstruct("completed");
    this.updatedAt = new Date();
  }

  markConsultantJoined(now: Date): void {
    const currentStatus = this.status.getValue();
    if (currentStatus !== "pending" && currentStatus !== "confirmed") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending or confirmed bookings can be marked as joined",
      );
    }

    if (this.consultantJoinedAt) {
      throw new DomainError(
        "CONSULTANT_ALREADY_JOINED",
        "Consultant join has already been recorded",
      );
    }

    const joinAvailableAt = new Date(this.startsAt.getTime() - 15 * 60 * 1000);
    if (now.getTime() < joinAvailableAt.getTime()) {
      throw new DomainError(
        "CONSULTANT_JOIN_TOO_EARLY",
        "Consultant join can only be recorded from 15 minutes before the booking start time",
      );
    }

    this.consultantJoinedAt = now;
    this.updatedAt = now;
  }

  markConsultationReminderEmailSent(now: Date): void {
    if (this.consultationReminderEmailSentAt) {
      throw new DomainError(
        "CONSULTATION_REMINDER_ALREADY_SENT",
        "Consultation reminder email has already been sent",
      );
    }

    this.consultationReminderEmailSentAt = now;
    this.updatedAt = now;
  }

  markLateArrivalAlertSent(sentAt: Date): void {
    if (this.lateArrivalAlertSentAt) {
      throw new DomainError(
        "LATE_ARRIVAL_ALERT_ALREADY_SENT",
        "Late arrival alert has already been sent",
      );
    }

    this.lateArrivalAlertSentAt = sentAt;
    this.updatedAt = sentAt;
  }

  updateMemo(memo: ConsultantMemo): void {
    this.consultantMemo = memo;
    this.updatedAt = new Date();
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getUsageSlotIds(): readonly string[] {
    return this.usageSlotIds;
  }

  getBufferSlotIds(): readonly string[] {
    return this.bufferSlotIds;
  }

  getAllOccupiedSlotIds(): readonly string[] {
    return [...this.usageSlotIds, ...this.bufferSlotIds];
  }

  getStartsAt(): Date {
    return this.startsAt;
  }

  getEndsAt(): Date {
    return this.endsAt;
  }

  getDurationMinutes(): SupportedDurationMinutes {
    return this.durationMinutes;
  }

  getStatus(): BookingStatus {
    return this.status;
  }

  getCancelDeadlineAt(): CancelDeadline {
    return this.cancelDeadlineAt;
  }

  getJoinUrl(): ZoomUrl | undefined {
    return this.joinUrl;
  }

  getConsultantJoinedAt(): Date | undefined {
    return this.consultantJoinedAt;
  }

  getConsultationReminderEmailSentAt(): Date | undefined {
    return this.consultationReminderEmailSentAt;
  }

  getLateArrivalAlertSentAt(): Date | undefined {
    return this.lateArrivalAlertSentAt;
  }

  getConsultantMemo(): ConsultantMemo {
    return this.consultantMemo;
  }

  getConsultationContent(): string | undefined {
    return this.consultationContent;
  }

  getPricePlanId(): string | undefined {
    return this.pricePlanId;
  }

  getPricePlanName(): string | undefined {
    return this.pricePlanName;
  }

  getPricePlanTotalJPY(): number | undefined {
    return this.pricePlanTotalJPY;
  }

  getAppliedUserCouponId(): string | undefined {
    return this.appliedUserCouponId;
  }

  getCouponDiscountJPY(): number | undefined {
    return this.couponDiscountJPY;
  }

  getDiscountedTotalJPY(): number | undefined {
    return this.discountedTotalJPY;
  }

  getEffectiveTotalJPY(): number | undefined {
    return this.discountedTotalJPY ?? this.pricePlanTotalJPY;
  }

  getCancelledAt(): Date | undefined {
    return this.cancelledAt;
  }

  getCancelledBy(): CancelledBy | undefined {
    return this.cancelledBy;
  }

  getCancellationFee(): CancellationFee | undefined {
    return this.cancellationFee;
  }

  isNoShow(): boolean {
    return this.noShow;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
