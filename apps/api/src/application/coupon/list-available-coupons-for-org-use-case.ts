import type { Coupon, CouponType } from "@/domain/coupon/coupon";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import type { IUserRepository } from "@/domain/user/user-repository";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

export type AvailableCouponIneligibilityReason =
  | "already-received"
  | "not-in-birth-month"
  | "limit-reached";

export interface AvailableCouponOutput {
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  batchSize: number | null;
  totalLimit: number | null;
  expiresInDays: number;
  isReceivable: boolean;
  ineligibilityReason: AvailableCouponIneligibilityReason | null;
}

export interface ListAvailableCouponsForOrgInput {
  userId: string;
  organizationId: string;
}

export class ListAvailableCouponsForOrgUseCase {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    input: ListAvailableCouponsForOrgInput,
  ): Promise<AvailableCouponOutput[]> {
    const now = new Date();
    const [all, user] = await Promise.all([
      this.couponRepository.findByOrganizationId(input.organizationId),
      this.userRepository.findById(input.userId),
    ]);
    const active = all.filter((c) => !c.isArchived());

    const results: AvailableCouponOutput[] = [];
    for (const coupon of active) {
      const reason = await this.eligibility(coupon, user, input.userId, now);
      results.push({
        couponId: coupon.getCouponId(),
        type: coupon.getType(),
        name: coupon.getName(),
        amountJPY: coupon.getAmountJPY(),
        batchSize: coupon.getBatchSize() ?? null,
        totalLimit: coupon.getTotalLimit() ?? null,
        expiresInDays: coupon.getExpiresInDays(),
        isReceivable: reason === null,
        ineligibilityReason: reason,
      });
    }
    return results;
  }

  private async eligibility(
    coupon: Coupon,
    user: Awaited<ReturnType<IUserRepository["findById"]>>,
    userId: string,
    now: Date,
  ): Promise<AvailableCouponIneligibilityReason | null> {
    if (coupon.getType() === "welcome") {
      const existing = await this.userCouponRepository.findByUserIdAndCouponId(
        userId,
        coupon.getCouponId(),
      );
      if (existing.length > 0) return "already-received";
      return null;
    }

    // birthday
    if (!user) return "not-in-birth-month";
    const birthMonth = user.getBirthDate().getBirthMonth();
    if (birthMonth !== now.getMonth() + 1) return "not-in-birth-month";

    const existing = await this.userCouponRepository.findByUserIdAndCouponId(
      userId,
      coupon.getCouponId(),
    );
    const receivedThisMonth = existing.some((c) => {
      const receivedAt = c.getReceivedAt();
      return (
        receivedAt.getFullYear() === now.getFullYear() &&
        receivedAt.getMonth() === now.getMonth()
      );
    });
    if (receivedThisMonth) return "already-received";

    const totalLimit = coupon.getTotalLimit();
    if (totalLimit !== undefined) {
      const totalDistributed = await this.userCouponRepository.countByCouponId(
        coupon.getCouponId(),
      );
      if (totalDistributed >= totalLimit) return "limit-reached";
    }
    return null;
  }
}
