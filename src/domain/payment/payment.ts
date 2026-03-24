import type { Money } from "@/domain/payment/money";
import { PaymentCapturedEvent } from "@/domain/payment/payment-events";
import { PaymentStatus } from "@/domain/payment/payment-status";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";

export type CaptureMethod = "batch" | "manual";

interface PaymentCreateProps {
  paymentId: string;
  bookingId: string;
  clientId: string;
  stripePaymentIntentId: string;
  money: Money;
}

interface PaymentProps extends PaymentCreateProps {
  status: PaymentStatus;
  captureMethod?: CaptureMethod;
}

export class Payment extends AggregateRoot {
  private constructor(
    private readonly paymentId: string,
    private readonly bookingId: string,
    private readonly clientId: string,
    private readonly stripePaymentIntentId: string,
    private readonly money: Money,
    private status: PaymentStatus,
    private captureMethod: CaptureMethod | undefined,
  ) {
    super();
  }

  static create(props: PaymentCreateProps): Payment {
    return new Payment(
      props.paymentId,
      props.bookingId,
      props.clientId,
      props.stripePaymentIntentId,
      props.money,
      PaymentStatus.create("authorized"),
      undefined,
    );
  }

  static reconstruct(props: PaymentProps): Payment {
    return new Payment(
      props.paymentId,
      props.bookingId,
      props.clientId,
      props.stripePaymentIntentId,
      props.money,
      props.status,
      props.captureMethod,
    );
  }

  capture(method: CaptureMethod): void {
    if (this.status.getValue() !== "authorized") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only authorized payments can be captured",
      );
    }
    this.status = PaymentStatus.reconstruct("captured");
    this.captureMethod = method;
    this.addDomainEvent(
      PaymentCapturedEvent.create({
        paymentId: this.paymentId,
        bookingId: this.bookingId,
        clientId: this.clientId,
        captureMethod: method,
        amountJPY: this.money.getTotalJPY(),
      }),
    );
  }

  cancel(): void {
    if (this.status.getValue() !== "authorized") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only authorized payments can be cancelled",
      );
    }
    this.status = PaymentStatus.reconstruct("cancelled");
  }

  getPaymentId(): string {
    return this.paymentId;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getClientId(): string {
    return this.clientId;
  }

  getStripePaymentIntentId(): string {
    return this.stripePaymentIntentId;
  }

  getMoney(): Money {
    return this.money;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getCaptureMethod(): CaptureMethod | undefined {
    return this.captureMethod;
  }
}
