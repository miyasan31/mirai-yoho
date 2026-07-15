import type { Coupon, CouponType } from "@/domain/coupon/coupon";

export interface CouponOutput {
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  distributionCount: number;
  expiresInDays: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function toCouponOutput(coupon: Coupon): CouponOutput {
  return {
    couponId: coupon.getCouponId(),
    type: coupon.getType(),
    name: coupon.getName(),
    amountJPY: coupon.getAmountJPY(),
    distributionCount: coupon.getDistributionCount(),
    expiresInDays: coupon.getExpiresInDays(),
    isActive: coupon.isActive(),
    isArchived: coupon.isArchived(),
    createdAt: coupon.getCreatedAt().toISOString(),
    updatedAt: coupon.getUpdatedAt().toISOString(),
    archivedAt: coupon.getArchivedAt()?.toISOString() ?? null,
  };
}
