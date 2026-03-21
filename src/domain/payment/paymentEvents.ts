import type { DomainEvent } from "@/domain/shared/domainEvent";

export class PaymentCapturedEvent implements DomainEvent {
  readonly eventName = "PaymentCaptured";
  readonly occurredAt: Date;
  readonly payload: {
    paymentId: string;
    bookingId: string;
    clientId: string;
    captureMethod: "batch" | "manual";
    amountJPY: number;
  };

  private constructor(payload: PaymentCapturedEvent["payload"]) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  static create(payload: PaymentCapturedEvent["payload"]): PaymentCapturedEvent {
    return new PaymentCapturedEvent(payload);
  }
}
