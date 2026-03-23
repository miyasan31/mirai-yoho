import { DomainError } from "@/domain/shared/domainError";

export class Money {
  private constructor(
    private readonly amountJPY: number,
    private readonly taxAmountJPY: number,
    private readonly taxRate: number,
  ) {}

  static create(amountJPY: number, taxRate: number): Money {
    if (amountJPY < 0) {
      throw new DomainError("INVALID_AMOUNT", "Amount must be non-negative");
    }
    if (taxRate < 0 || taxRate > 1) {
      throw new DomainError(
        "INVALID_TAX_RATE",
        "Tax rate must be between 0 and 1",
      );
    }
    const taxAmountJPY = Math.floor(amountJPY * taxRate);
    return new Money(amountJPY, taxAmountJPY, taxRate);
  }

  static fromTaxIncluded(totalJPY: number, taxRate: number): Money {
    if (totalJPY < 0) {
      throw new DomainError("INVALID_AMOUNT", "Total must be non-negative");
    }
    if (taxRate < 0 || taxRate > 1) {
      throw new DomainError(
        "INVALID_TAX_RATE",
        "Tax rate must be between 0 and 1",
      );
    }
    const amountJPY = Math.floor(totalJPY / (1 + taxRate));
    const taxAmountJPY = totalJPY - amountJPY;
    return new Money(amountJPY, taxAmountJPY, taxRate);
  }

  static reconstruct(
    amountJPY: number,
    taxAmountJPY: number,
    taxRate: number,
  ): Money {
    return new Money(amountJPY, taxAmountJPY, taxRate);
  }

  getAmountJPY(): number {
    return this.amountJPY;
  }

  getTaxAmountJPY(): number {
    return this.taxAmountJPY;
  }

  getTotalJPY(): number {
    return this.amountJPY + this.taxAmountJPY;
  }

  getTaxRate(): number {
    return this.taxRate;
  }

  equals(other: Money): boolean {
    return (
      this.amountJPY === other.amountJPY &&
      this.taxAmountJPY === other.taxAmountJPY &&
      this.taxRate === other.taxRate
    );
  }
}
