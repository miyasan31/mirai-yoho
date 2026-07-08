import type { UserCoupon } from "@/domain/user-coupon/user-coupon";

export interface IUserCouponRepository {
  findById(userCouponId: string): Promise<UserCoupon | null>;
  findByUserId(userId: string): Promise<UserCoupon[]>;
  findRedeemableByUserId(userId: string, now: Date): Promise<UserCoupon[]>;
  save(coupon: UserCoupon): Promise<void>;
}
