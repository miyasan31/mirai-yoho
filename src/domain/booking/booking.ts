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
  bookingId: string;
  clientId: string;
  consultantId: string;
  slotId: string;
  startDatetime: Date;
  consultantMemo: ConsultantMemo;
  consultationContent?: string;
}

interface BookingProps extends BookingCreateProps {
  status: BookingStatus;
  cancelDeadline: CancelDeadline;
  zoomUrl?: ZoomUrl;
  stripePaymentIntentId?: string;
}

export class Booking extends AggregateRoot {
  private constructor(
    private readonly bookingId: string,
    private readonly clientId: string,
    private readonly consultantId: string,
    private readonly slotId: string,
    private readonly startDatetime: Date,
    private status: BookingStatus,
    private readonly cancelDeadline: CancelDeadline,
    private zoomUrl: ZoomUrl | undefined,
    private consultantMemo: ConsultantMemo,
    private consultationContent: string | undefined,
    private stripePaymentIntentId: string | undefined,
  ) {
    super();
  }

  static create(props: BookingCreateProps): Booking {
    return new Booking(
      props.bookingId,
      props.clientId,
      props.consultantId,
      props.slotId,
      props.startDatetime,
      BookingStatus.create("pending"),
      CancelDeadline.create(props.startDatetime),
      undefined,
      props.consultantMemo,
      props.consultationContent,
      undefined,
    );
  }

  static reconstruct(props: BookingProps): Booking {
    return new Booking(
      props.bookingId,
      props.clientId,
      props.consultantId,
      props.slotId,
      props.startDatetime,
      props.status,
      props.cancelDeadline,
      props.zoomUrl,
      props.consultantMemo,
      props.consultationContent,
      props.stripePaymentIntentId,
    );
  }

  confirm(zoomUrl: ZoomUrl, paymentIntentId: string): void {
    if (this.status.getValue() !== "pending") {
      throw new DomainError(
        "INVALID_STATUS_TRANSITION",
        "Only pending bookings can be confirmed",
      );
    }
    this.status = BookingStatus.reconstruct("confirmed");
    this.zoomUrl = zoomUrl;
    this.stripePaymentIntentId = paymentIntentId;
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
  }

  updateMemo(memo: ConsultantMemo): void {
    this.consultantMemo = memo;
  }

  getBookingId(): string {
    return this.bookingId;
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

  getConsultantMemo(): ConsultantMemo {
    return this.consultantMemo;
  }

  getConsultationContent(): string | undefined {
    return this.consultationContent;
  }

  getStripePaymentIntentId(): string | undefined {
    return this.stripePaymentIntentId;
  }
}
