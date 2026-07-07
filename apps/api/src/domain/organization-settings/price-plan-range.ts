import { DomainError } from "@mirai-yoho/shared/domain-error";

export interface PricePlanRangeProps {
  minTotalJPY: number;
  maxTotalJPY: number;
}

export class PricePlanRange {
  private constructor(
    private readonly minTotalJPY: number,
    private readonly maxTotalJPY: number,
  ) {}

  static create(props: PricePlanRangeProps): PricePlanRange {
    if (
      !Number.isInteger(props.minTotalJPY) ||
      !Number.isInteger(props.maxTotalJPY)
    ) {
      throw new DomainError(
        "INVALID_PRICE_PLAN_RANGE",
        "Price plan range values must be integers",
      );
    }
    if (props.minTotalJPY < 0 || props.maxTotalJPY < 0) {
      throw new DomainError(
        "INVALID_PRICE_PLAN_RANGE",
        "Price plan range values must be non-negative",
      );
    }
    if (props.minTotalJPY > 100000 || props.maxTotalJPY > 100000) {
      throw new DomainError(
        "INVALID_PRICE_PLAN_RANGE",
        "Price plan range values must be 100000 or less",
      );
    }
    if (props.minTotalJPY > props.maxTotalJPY) {
      throw new DomainError(
        "INVALID_PRICE_PLAN_RANGE",
        "Minimum price must be less than or equal to maximum price",
      );
    }
    return new PricePlanRange(props.minTotalJPY, props.maxTotalJPY);
  }

  static createDefault(): PricePlanRange {
    return new PricePlanRange(0, 100000);
  }

  static reconstruct(props: PricePlanRangeProps): PricePlanRange {
    return new PricePlanRange(props.minTotalJPY, props.maxTotalJPY);
  }

  contains(totalJPY: number): boolean {
    return totalJPY >= this.minTotalJPY && totalJPY <= this.maxTotalJPY;
  }

  toJSON(): PricePlanRangeProps {
    return {
      minTotalJPY: this.minTotalJPY,
      maxTotalJPY: this.maxTotalJPY,
    };
  }
}
