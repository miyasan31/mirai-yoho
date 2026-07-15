import {
  type CouponOutput,
  toCouponOutput,
} from "@/application/coupon/coupon-output";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";

export interface ListCouponsInput {
  organizationId: string;
}

export class ListCouponsUseCase {
  constructor(private readonly couponRepository: ICouponRepository) {}

  async execute(input: ListCouponsInput): Promise<CouponOutput[]> {
    const coupons = await this.couponRepository.findByOrganizationId(
      input.organizationId,
    );
    const now = new Date();
    return coupons.map((coupon) => toCouponOutput(coupon, now));
  }
}
