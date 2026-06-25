import type { Money } from "@/domain/payment/money";
import { PaymentChargedEvent } from "@/domain/payment/payment-events";
import { PaymentStatus } from "@/domain/payment/payment-status";
import { PaymentStrategy } from "@/domain/payment/payment-strategy";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";

export type ChargeMethod = "batch" | "manual";

interface PaymentDeferredCreateProps {
  organizationId: string;
  paymentId: string;
  bookingId: string;
  customerId: string;
  stripeSetupIntentId: string;
  money: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentImmediateCreateProps {
  organizationId: string;
  paymentId: string;
  bookingId: string;
  customerId: string;
  stripePaymentIntentId: string;
  money: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentProps {
  organizationId: string;
  paymentId: string;
  bookingId: string;
  customerId: string;
  money: Money;
  status: PaymentStatus;
  paymentStrategy: PaymentStrategy;
  stripePaymentIntentId?: string;
  stripeSetupIntentId?: string;
  stripePaymentMethodId?: string;
  chargeMethod?: ChargeMethod;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Payment extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly paymentId: string,
    private readonly bookingId: string,
    private readonly customerId: string,
    private readonly money: Money,
    private status: PaymentStatus,
    private readonly paymentStrategy: PaymentStrategy,
    private stripePaymentIntentId: string | undefined,
    private stripeSetupIntentId: string | undefined,
    private stripePaymentMethodId: string | undefined,
    private chargeMethod: ChargeMethod | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static createDeferred(props: PaymentDeferredCreateProps): Payment {
    const now = new Date();
    return new Payment(
      props.organizationId,
      props.paymentId,
      props.bookingId,
      props.customerId,
      props.money,
      PaymentStatus.create("setup_pending"),
      PaymentStrategy.create("deferred"),
      undefined,
      props.stripeSetupIntentId,
      undefined,
      undefined,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static createImmediate(props: PaymentImmediateCreateProps): Payment {
    const now = new Date();
    return new Payment(
      props.organizationId,
      props.paymentId,
      props.bookingId,
      props.customerId,
      props.money,
      PaymentStatus.create("charged"),
      PaymentStrategy.create("immediate"),
      props.stripePaymentIntentId,
      undefined,
      undefined,
      undefined,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: PaymentProps): Payment {
    const createdAt = props.createdAt ?? new Date(0);
    return new Payment(
      props.organizationId,
      props.paymentId,
      props.bookingId,
      props.customerId,
      props.money,
      props.status,
      props.paymentStrategy,
      props.stripePaymentIntentId,
      props.stripeSetupIntentId,
      props.stripePaymentMethodId,
      props.chargeMethod,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  completeSetup(paymentMethodId: string): void {
    if (this.status.getValue() !== "setup_pending") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only setup_pending payments can complete setup",
      );
    }
    this.status = PaymentStatus.reconstruct("setup_complete");
    this.stripePaymentMethodId = paymentMethodId;
    this.updatedAt = new Date();
  }

  charge(paymentIntentId: string, method: ChargeMethod): void {
    if (this.status.getValue() !== "setup_complete") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only setup_complete payments can be charged",
      );
    }
    this.status = PaymentStatus.reconstruct("charged");
    this.stripePaymentIntentId = paymentIntentId;
    this.chargeMethod = method;
    this.updatedAt = new Date();
    this.addDomainEvent(
      PaymentChargedEvent.create({
        paymentId: this.paymentId,
        bookingId: this.bookingId,
        customerId: this.customerId,
        chargeMethod: method,
        amountJPY: this.money.getTotalJPY(),
      }),
    );
  }

  refund(): void {
    if (this.status.getValue() !== "charged") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only charged payments can be refunded",
      );
    }
    if (!this.paymentStrategy.isImmediate()) {
      throw new DomainError(
        "INVALID_PAYMENT_STRATEGY",
        "Only immediate payments can be refunded",
      );
    }
    this.status = PaymentStatus.reconstruct("refunded");
    this.updatedAt = new Date();
  }

  cancel(): void {
    const currentStatus = this.status.getValue();
    if (
      currentStatus !== "setup_pending" &&
      currentStatus !== "setup_complete"
    ) {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only setup_pending or setup_complete payments can be cancelled",
      );
    }
    this.status = PaymentStatus.reconstruct("cancelled");
    this.updatedAt = new Date();
  }

  failCharge(): void {
    if (this.status.getValue() !== "setup_complete") {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        "Only setup_complete payments can fail charge",
      );
    }
    this.status = PaymentStatus.reconstruct("failed");
    this.updatedAt = new Date();
  }

  getPaymentId(): string {
    return this.paymentId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getStripePaymentIntentId(): string | undefined {
    return this.stripePaymentIntentId;
  }

  getStripeSetupIntentId(): string | undefined {
    return this.stripeSetupIntentId;
  }

  getStripePaymentMethodId(): string | undefined {
    return this.stripePaymentMethodId;
  }

  getMoney(): Money {
    return this.money;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getPaymentStrategy(): PaymentStrategy {
    return this.paymentStrategy;
  }

  getChargeMethod(): ChargeMethod | undefined {
    return this.chargeMethod;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
