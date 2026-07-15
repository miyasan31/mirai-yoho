import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";

export interface ArchiveCouponInput {
  organizationId: string;
  couponId: string;
}

export class ArchiveCouponUseCase {
  constructor(private readonly couponRepository: ICouponRepository) {}

  async execute(input: ArchiveCouponInput): Promise<void> {
    const coupon = await this.couponRepository.findById(
      input.organizationId,
      input.couponId,
    );
    if (!coupon) {
      throw new AppError(404, "COUPON_NOT_FOUND", "Coupon not found");
    }
    coupon.archive();
    await this.couponRepository.save(coupon);
  }
}
