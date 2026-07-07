import { DomainError } from "@mirai-yoho/shared/domain-error";

const VALID_STATUSES = [
  "setup_pending",
  "setup_complete",
  "charged",
  "refunded",
  "cancelled",
  "failed",
] as const;
export type PaymentStatusValue = (typeof VALID_STATUSES)[number];

export class PaymentStatus {
  private constructor(private readonly value: PaymentStatusValue) {}

  static create(value: string): PaymentStatus {
    if (!VALID_STATUSES.includes(value as PaymentStatusValue)) {
      throw new DomainError(
        "INVALID_PAYMENT_STATUS",
        `Invalid status: ${value}`,
      );
    }
    return new PaymentStatus(value as PaymentStatusValue);
  }

  static reconstruct(value: string): PaymentStatus {
    return new PaymentStatus(value as PaymentStatusValue);
  }

  getValue(): PaymentStatusValue {
    return this.value;
  }

  equals(other: PaymentStatus): boolean {
    return this.value === other.getValue();
  }
}
