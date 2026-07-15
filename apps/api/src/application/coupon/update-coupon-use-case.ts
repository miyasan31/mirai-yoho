import {
  type CouponOutput,
  toCouponOutput,
} from "@/application/coupon/coupon-output";
import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";

export interface UpdateCouponInput {
  organizationId: string;
  couponId: string;
  name?: string;
  amountJPY?: number;
  distributionCount?: number;
}

export class UpdateCouponUseCase {
  constructor(private readonly couponRepository: ICouponRepository) {}

  async execute(input: UpdateCouponInput): Promise<CouponOutput> {
    const coupon = await this.couponRepository.findById(
      input.organizationId,
      input.couponId,
    );
    if (!coupon) {
      throw new AppError(404, "COUPON_NOT_FOUND", "Coupon not found");
    }

    if (input.name !== undefined) {
      coupon.rename(input.name);
    }
    if (input.amountJPY !== undefined) {
      coupon.updateAmount(input.amountJPY);
    }
    if (input.distributionCount !== undefined) {
      coupon.updateDistributionCount(input.distributionCount);
    }

    await this.couponRepository.save(coupon);
    return toCouponOutput(coupon);
  }
}
