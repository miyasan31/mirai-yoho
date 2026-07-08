import type { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

interface ListUserCouponsInput {
  userId: string;
}

export class ListUserCouponsUseCase {
  constructor(private readonly userCouponRepository: IUserCouponRepository) {}

  async execute(input: ListUserCouponsInput): Promise<UserCoupon[]> {
    return this.userCouponRepository.findByUserId(input.userId);
  }
}
