import {
  type CouponOutput,
  toCouponOutput,
} from "@/application/coupon/coupon-output";
import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";

export interface GetCouponInput {
  organizationId: string;
  couponId: string;
}

export class GetCouponUseCase {
  constructor(private readonly couponRepository: ICouponRepository) {}

  async execute(input: GetCouponInput): Promise<CouponOutput> {
    const coupon = await this.couponRepository.findById(
      input.organizationId,
      input.couponId,
    );
    if (!coupon) {
      throw new AppError(404, "COUPON_NOT_FOUND", "Coupon not found");
    }
    return toCouponOutput(coupon, new Date());
  }
}
