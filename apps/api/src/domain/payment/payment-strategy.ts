import { DomainError } from "@mirai-yoho/shared/domain-error";

const VALID_STRATEGIES = ["deferred", "immediate"] as const;
export type PaymentStrategyValue = (typeof VALID_STRATEGIES)[number];

export class PaymentStrategy {
  private constructor(private readonly value: PaymentStrategyValue) {}

  static create(value: string): PaymentStrategy {
    if (!VALID_STRATEGIES.includes(value as PaymentStrategyValue)) {
      throw new DomainError(
        "INVALID_PAYMENT_STRATEGY",
        `Invalid strategy: ${value}`,
      );
    }
    return new PaymentStrategy(value as PaymentStrategyValue);
  }

  static reconstruct(value: string): PaymentStrategy {
    return new PaymentStrategy(value as PaymentStrategyValue);
  }

  getValue(): PaymentStrategyValue {
    return this.value;
  }

  isDeferred(): boolean {
    return this.value === "deferred";
  }

  isImmediate(): boolean {
    return this.value === "immediate";
  }

  equals(other: PaymentStrategy): boolean {
    return this.value === other.getValue();
  }
}
