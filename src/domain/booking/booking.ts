import {
  BookingCancelledEvent,
  BookingConfirmedEvent,
} from "@/domain/booking/booking-events";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import type { ConsultantMemo } from "@/domain/booking/consultant-memo";
import type { ZoomUrl } from "@/domain/booking/zoom-url";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";

interface BookingCreateProps {
  organizationId: string;
  bookingId: string;
  clientId: string;
  consultantId: string;
  slotId: string;
  startDatetime: Date;
  consultantMemo: ConsultantMemo;
  consultationContent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BookingProps extends BookingCreateProps {
  status: BookingStatus;
  cancelDeadline: CancelDeadline;
  zoomUrl?: ZoomUrl;
  consultantJoinedAt?: Date;
  lateArrivalAlertSentAt?: Date;
}

export class Booking extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly bookingId: string,
    private readonly clientId: string,
    private readonly consultantId: string,
    private readonly slotId: string,
    private readonly startDatetime: Date,
    private status: BookingStatus,
    private readonly cancelDeadline: CancelDeadline,
    private zoomUrl: ZoomUrl | undefined,
    private consultantJoinedAt: Date | undefined,
    private lateArrivalAlertSentAt: Date | undefined,
    private consultantMemo: ConsultantMemo,
    private consultationContent: string | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: BookingCreateProps): Booking {
    const now = new Date();
    return new Booking(
      props.organizationId,
      props.bookingId,
      props.clientId,
      props.consultantId,
      props.slotId,
      props.startDatetime,
      BookingStatus.create("pending"),
      CancelDeadline.create(props.startDatetime),
      undefined,
      undefined,
      undefined,
      props.consultantMemo,
      props.consultationContent,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: BookingProps): Booking {
    const createdAt = props.createdAt ?? new Date(0);
    return new Booking(
      props.organizationId,
      props.bookingId,
      props.clientId,
      props.consultantId,
      props.slotId,
      props.startDatetime,
      props.status,
      props.cancelDeadline,
      props.zoomUrl,
      props.consultantJoinedAt,
      props.lateArrivalAlertSentAt,
      props.consultantMemo,
      props.consultationContent,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  confirm(zoomUrl: ZoomUrl): void {
    if (this.status.getValue() !== "pending") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending bookings can be confirmed",
      );
    }
    this.status = BookingStatus.reconstruct("confirmed");
    this.zoomUrl = zoomUrl;
    this.updatedAt = new Date();
    this.addDomainEvent(
      BookingConfirmedEvent.create({
        bookingId: this.bookingId,
        clientId: this.clientId,
        consultantId: this.consultantId,
        zoomUrl: zoomUrl.getValue(),
        startDatetime: this.startDatetime,
      }),
    );
  }

  cancel(cancelledBy: "client" | "admin"): void {
    if (cancelledBy === "client" && this.cancelDeadline.isExpired(new Date())) {
      throw new DomainError(
        "CANCEL_DEADLINE_EXPIRED",
        "Cancel deadline has passed",
      );
    }
    const currentStatus = this.status.getValue();
    if (currentStatus !== "pending" && currentStatus !== "confirmed") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending or confirmed bookings can be cancelled",
      );
    }
    this.status = BookingStatus.reconstruct("cancelled");
    this.updatedAt = new Date();
    this.addDomainEvent(
      BookingCancelledEvent.create({
        bookingId: this.bookingId,
        clientId: this.clientId,
        consultantId: this.consultantId,
        cancelledBy,
      }),
    );
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

    const joinAvailableAt = new Date(
      this.startDatetime.getTime() - 15 * 60 * 1000,
    );
    if (now.getTime() < joinAvailableAt.getTime()) {
      throw new DomainError(
        "CONSULTANT_JOIN_TOO_EARLY",
        "Consultant join can only be recorded from 15 minutes before the booking start time",
      );
    }

    this.consultantJoinedAt = now;
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

  getClientId(): string {
    return this.clientId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getSlotId(): string {
    return this.slotId;
  }

  getStartDatetime(): Date {
    return this.startDatetime;
  }

  getStatus(): BookingStatus {
    return this.status;
  }

  getCancelDeadline(): CancelDeadline {
    return this.cancelDeadline;
  }

  getZoomUrl(): ZoomUrl | undefined {
    return this.zoomUrl;
  }

  getConsultantJoinedAt(): Date | undefined {
    return this.consultantJoinedAt;
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

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
