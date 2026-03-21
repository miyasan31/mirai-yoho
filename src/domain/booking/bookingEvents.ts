import type { DomainEvent } from "@/domain/shared/domainEvent";

export class BookingConfirmedEvent implements DomainEvent {
  readonly eventName = "BookingConfirmed";
  readonly occurredAt: Date;
  readonly payload: {
    bookingId: string;
    clientId: string;
    consultantId: string;
    zoomUrl: string;
    startDatetime: Date;
  };

  private constructor(payload: BookingConfirmedEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(payload: BookingConfirmedEvent["payload"]): BookingConfirmedEvent {
    return new BookingConfirmedEvent(payload);
  }
}

export class BookingCancelledEvent implements DomainEvent {
  readonly eventName = "BookingCancelled";
  readonly occurredAt: Date;
  readonly payload: {
    bookingId: string;
    clientId: string;
    consultantId: string;
    cancelledBy: "client" | "admin";
  };

  private constructor(payload: BookingCancelledEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(payload: BookingCancelledEvent["payload"]): BookingCancelledEvent {
    return new BookingCancelledEvent(payload);
  }
}
