import type { Coupon, CouponType } from "@/domain/coupon/coupon";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import type { IUserRepository } from "@/domain/user/user-repository";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

export type AvailableCouponIneligibilityReason =
  | "already-received"
  | "not-in-birth-month";

export interface AvailableCouponOutput {
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  batchSize: number;
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
    const [all, user, userCoupons] = await Promise.all([
      this.couponRepository.findByOrganizationId(input.organizationId),
      this.userRepository.findById(input.userId),
      this.userCouponRepository.findByUserId(input.userId),
    ]);
    const active = all.filter((c) => !c.isArchived());

    const userCouponsByCouponId = new Map<
      string,
      Awaited<ReturnType<IUserCouponRepository["findByUserId"]>>
    >();
    for (const userCoupon of userCoupons) {
      const couponId = userCoupon.getCouponId();
      const list = userCouponsByCouponId.get(couponId) ?? [];
      list.push(userCoupon);
      userCouponsByCouponId.set(couponId, list);
    }

    return active.map((coupon) => {
      const existing = userCouponsByCouponId.get(coupon.getCouponId()) ?? [];
      const reason = this.eligibility(coupon, user, existing, now);
      return {
        couponId: coupon.getCouponId(),
        type: coupon.getType(),
        name: coupon.getName(),
        amountJPY: coupon.getAmountJPY(),
        batchSize: coupon.getBatchSize(),
        expiresInDays: coupon.getExpiresInDays(),
        isReceivable: reason === null,
        ineligibilityReason: reason,
      };
    });
  }

  private eligibility(
    coupon: Coupon,
    user: Awaited<ReturnType<IUserRepository["findById"]>>,
    existing: Awaited<ReturnType<IUserCouponRepository["findByUserId"]>>,
    now: Date,
  ): AvailableCouponIneligibilityReason | null {
    if (coupon.getType() === "welcome") {
      if (existing.length > 0) return "already-received";
      return null;
    }

    // birthday
    if (!user) return "not-in-birth-month";
    const birthMonth = user.getBirthDate().getBirthMonth();
    if (birthMonth !== now.getMonth() + 1) return "not-in-birth-month";

    const receivedThisMonth = existing.some((c) => {
      const receivedAt = c.getReceivedAt();
      return (
        receivedAt.getFullYear() === now.getFullYear() &&
        receivedAt.getMonth() === now.getMonth()
      );
    });
    if (receivedThisMonth) return "already-received";

    return null;
  }
}
