import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

export interface DistributeGeneralCouponInput {
  organizationId: string;
  couponId: string;
}

export interface DistributeGeneralCouponOutput {
  issuedCount: number;
  skippedCount: number;
  reachedLimit: boolean;
}

export class DistributeGeneralCouponUseCase {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly userCouponRepository: IUserCouponRepository,
  ) {}

  async execute(
    input: DistributeGeneralCouponInput,
  ): Promise<DistributeGeneralCouponOutput> {
    const now = new Date();
    const coupon = await this.couponRepository.findById(
      input.organizationId,
      input.couponId,
    );
    if (!coupon) {
      throw new AppError(404, "COUPON_NOT_FOUND", "Coupon not found");
    }
    if (coupon.getType() !== "general") {
      throw new AppError(
        400,
        "COUPON_NOT_DISTRIBUTABLE",
        "Only general coupons can be distributed",
      );
    }
    if (!coupon.isActive(now)) {
      throw new AppError(
        409,
        "COUPON_NOT_ACTIVE",
        "Coupon is archived or outside its active period",
      );
    }

    const currentDistributed = await this.userCouponRepository.countByCouponId(
      coupon.getCouponId(),
    );
    const remaining = coupon.getDistributionCount() - currentDistributed;
    if (remaining <= 0) {
      return { issuedCount: 0, skippedCount: 0, reachedLimit: true };
    }

    const customers = await this.customerRepository.findAll(
      input.organizationId,
    );
    // 顧客に User が紐付いていない場合は配布対象外
    const candidateUserIds = Array.from(
      new Set(
        customers
          .map((c) => c.getUserId())
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );

    const expiresAt = coupon.calcExpiresAtFor(now);
    const targets: string[] = [];
    let skippedCount = 0;
    for (const userId of candidateUserIds) {
      const existing = await this.userCouponRepository.findByUserIdAndCouponId(
        userId,
        coupon.getCouponId(),
      );
      if (existing.length > 0) {
        skippedCount++;
        continue;
      }
      targets.push(userId);
      if (targets.length >= remaining) break;
    }

    const toIssue = targets.map((userId) =>
      UserCoupon.receive({
        userCouponId: crypto.randomUUID(),
        userId,
        couponId: coupon.getCouponId(),
        organizationId: input.organizationId,
        amountJPY: coupon.getAmountJPY(),
        couponName: coupon.getName(),
        type: "general",
        receivedAt: now,
        expiresAt,
      }),
    );

    if (toIssue.length > 0) {
      await this.userCouponRepository.saveMany(toIssue);
    }

    return {
      issuedCount: toIssue.length,
      skippedCount,
      reachedLimit:
        currentDistributed + toIssue.length >= coupon.getDistributionCount(),
    };
  }
}
