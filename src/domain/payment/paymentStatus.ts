import { DomainError } from "@/domain/shared/domainError";

const VALID_STATUSES = ["authorized", "captured", "cancelled", "failed"] as const;
export type PaymentStatusValue = (typeof VALID_STATUSES)[number];

export class PaymentStatus {
  private constructor(private readonly value: PaymentStatusValue) {}

  static create(value: string): PaymentStatus {
    if (!VALID_STATUSES.includes(value as PaymentStatusValue)) {
      throw new DomainError("INVALID_PAYMENT_STATUS", `Invalid status: ${value}`);
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
