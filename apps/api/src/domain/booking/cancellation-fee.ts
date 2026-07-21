import { DomainError } from "@mirai-yoho/shared/domain-error";

const VALID_TYPES = ["none", "full"] as const;
export type CancellationFeeType = (typeof VALID_TYPES)[number];

export class CancellationFee {
  private constructor(
    private readonly type: CancellationFeeType,
    private readonly amountJPY: number,
  ) {}

  static none(): CancellationFee {
    return new CancellationFee("none", 0);
  }

  static full(amountJPY: number): CancellationFee {
    if (amountJPY < 0) {
      throw new DomainError(
        "INVALID_CANCELLATION_FEE",
        "Cancellation fee must be non-negative",
      );
    }
    return new CancellationFee("full", amountJPY);
  }

  static reconstruct(type: string, amountJPY: number): CancellationFee {
    if (!VALID_TYPES.includes(type as CancellationFeeType)) {
      throw new DomainError(
        "INVALID_CANCELLATION_FEE_TYPE",
        `Invalid cancellation fee type: ${type}`,
      );
    }
    return new CancellationFee(type as CancellationFeeType, amountJPY);
  }

  getType(): CancellationFeeType {
    return this.type;
  }

  getAmountJPY(): number {
    return this.amountJPY;
  }

  isFull(): boolean {
    return this.type === "full";
  }

  isNone(): boolean {
    return this.type === "none";
  }

  equals(other: CancellationFee): boolean {
    return this.type === other.type && this.amountJPY === other.amountJPY;
  }
}
