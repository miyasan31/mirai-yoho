import type { Coupon, CouponType } from "@/domain/coupon/coupon";

export interface CouponOutput {
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  distributionCount: number;
  startsAt: string | null;
  expiresInDays: number | null;
  expiresAt: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function toCouponOutput(coupon: Coupon, now: Date): CouponOutput {
  return {
    couponId: coupon.getCouponId(),
    type: coupon.getType(),
    name: coupon.getName(),
    amountJPY: coupon.getAmountJPY(),
    distributionCount: coupon.getDistributionCount(),
    startsAt: coupon.getStartsAt()?.toISOString() ?? null,
    expiresInDays: coupon.getExpiresInDays() ?? null,
    expiresAt: coupon.getExpiresAt()?.toISOString() ?? null,
    isActive: coupon.isActive(now),
    isArchived: coupon.isArchived(),
    createdAt: coupon.getCreatedAt().toISOString(),
    updatedAt: coupon.getUpdatedAt().toISOString(),
    archivedAt: coupon.getArchivedAt()?.toISOString() ?? null,
  };
}
