import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

export interface ReceiveWelcomeCouponsInput {
  userId: string;
  organizationId: string;
}

export interface ReceiveWelcomeCouponsOutput {
  issuedCount: number;
  alreadyReceived: boolean;
}

export class ReceiveWelcomeCouponsUseCase {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
  ) {}

  async execute(
    input: ReceiveWelcomeCouponsInput,
  ): Promise<ReceiveWelcomeCouponsOutput> {
    const now = new Date();
    const all = await this.couponRepository.findByOrganizationId(
      input.organizationId,
    );
    const welcome = all.find(
      (c) => c.getType() === "welcome" && !c.isArchived(),
    );
    if (!welcome) {
      throw new AppError(
        404,
        "WELCOME_COUPON_NOT_CONFIGURED",
        "This organization does not offer a welcome coupon",
      );
    }
    if (!welcome.isActive(now)) {
      throw new AppError(
        409,
        "WELCOME_COUPON_DISABLED",
        "Welcome coupon is not currently active",
      );
    }

    // 冪等性: 同ユーザーが同一 welcome couponId を既に受け取っていたら no-op
    const existing = await this.userCouponRepository.findByUserIdAndCouponId(
      input.userId,
      welcome.getCouponId(),
    );
    if (existing.length > 0) {
      return { issuedCount: 0, alreadyReceived: true };
    }

    const expiresAt = welcome.calcExpiresAtFor(now);
    const coupons: UserCoupon[] = [];
    for (let i = 0; i < welcome.getDistributionCount(); i++) {
      coupons.push(
        UserCoupon.receive({
          userCouponId: crypto.randomUUID(),
          userId: input.userId,
          couponId: welcome.getCouponId(),
          organizationId: input.organizationId,
          amountJPY: welcome.getAmountJPY(),
          couponName: welcome.getName(),
          type: "welcome",
          receivedAt: now,
          expiresAt,
        }),
      );
    }
    await this.userCouponRepository.saveMany(coupons);
    return { issuedCount: coupons.length, alreadyReceived: false };
  }
}
