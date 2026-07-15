import type { UserCoupon } from "@/domain/user-coupon/user-coupon";

export interface IUserCouponRepository {
  findById(userCouponId: string): Promise<UserCoupon | null>;
  findByUserId(userId: string): Promise<UserCoupon[]>;
  findByUserIdAndCouponId(
    userId: string,
    couponId: string,
  ): Promise<UserCoupon[]>;
  findRedeemableByUserId(userId: string, now: Date): Promise<UserCoupon[]>;
  countByCouponId(couponId: string): Promise<number>;
  save(coupon: UserCoupon): Promise<void>;
  saveMany(coupons: UserCoupon[]): Promise<void>;
}
