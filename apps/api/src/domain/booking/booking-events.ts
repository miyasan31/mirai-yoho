import type { DomainEvent } from "@/domain/shared/domain-event";

export class BookingConfirmedEvent implements DomainEvent {
  readonly eventName = "BookingConfirmed";
  readonly occurredAt: Date;
  readonly payload: {
    bookingId: string;
    customerId: string;
    consultantId: string;
    joinUrl: string;
    startsAt: Date;
    endsAt: Date;
  };

  private constructor(payload: BookingConfirmedEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(
    payload: BookingConfirmedEvent["payload"],
  ): BookingConfirmedEvent {
    return new BookingConfirmedEvent(payload);
  }
}

export class BookingCancelledEvent implements DomainEvent {
  readonly eventName = "BookingCancelled";
  readonly occurredAt: Date;
  readonly payload: {
    bookingId: string;
    customerId: string;
    consultantId: string;
    cancelledBy: "customer" | "admin" | "consultant";
    cancellationCategory: "before_previous_day" | "on_the_day" | "no_show";
    cancellationFeeJPY: number;
    refundJPY: number;
    startsAt: Date;
  };

  private constructor(payload: BookingCancelledEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(
    payload: BookingCancelledEvent["payload"],
  ): BookingCancelledEvent {
    return new BookingCancelledEvent(payload);
  }
}
