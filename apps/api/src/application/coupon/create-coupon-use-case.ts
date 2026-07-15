import {
  type CouponOutput,
  toCouponOutput,
} from "@/application/coupon/coupon-output";
import { AppError } from "@/application/shared/app-error";
import { Coupon, type CouponType } from "@/domain/coupon/coupon";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";

export interface CreateCouponInput {
  organizationId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  distributionCount: number;
  startsAt?: Date;
  expiresInDays?: number;
  expiresAt?: Date;
}

export class CreateCouponUseCase {
  constructor(private readonly couponRepository: ICouponRepository) {}

  async execute(input: CreateCouponInput): Promise<CouponOutput> {
    if (input.type === "welcome" || input.type === "birthday") {
      const existing = await this.couponRepository.findByOrganizationId(
        input.organizationId,
      );
      const already = existing.find(
        (c) => c.getType() === input.type && !c.isArchived(),
      );
      if (already) {
        throw new AppError(
          409,
          "COUPON_TYPE_ALREADY_EXISTS",
          `Active ${input.type} coupon already exists for this organization`,
        );
      }
    }

    const coupon = Coupon.create({
      organizationId: input.organizationId,
      couponId: crypto.randomUUID(),
      type: input.type,
      name: input.name,
      amountJPY: input.amountJPY,
      distributionCount: input.distributionCount,
      startsAt: input.startsAt,
      expiresInDays: input.expiresInDays,
      expiresAt: input.expiresAt,
    });

    await this.couponRepository.save(coupon);
    return toCouponOutput(coupon, new Date());
  }
}
