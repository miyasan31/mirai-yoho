import type { DomainEvent } from "@/domain/shared/domain-event";

export class PaymentChargedEvent implements DomainEvent {
  readonly eventName = "PaymentCharged";
  readonly occurredAt: Date;
  readonly payload: {
    paymentId: string;
    bookingId: string;
    customerId: string;
    chargeMethod: "batch" | "manual";
    amountJPY: number;
  };

  private constructor(payload: PaymentChargedEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(payload: PaymentChargedEvent["payload"]): PaymentChargedEvent {
    return new PaymentChargedEvent(payload);
  }
}
