import { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

interface ReceiveCouponInput {
  userId: string;
  couponId: string;
  organizationId?: string;
  expiresAt?: Date;
}

interface ReceiveCouponOutput {
  userCouponId: string;
}

export class ReceiveCouponUseCase {
  constructor(private readonly userCouponRepository: IUserCouponRepository) {}

  async execute(input: ReceiveCouponInput): Promise<ReceiveCouponOutput> {
    const userCouponId = crypto.randomUUID();
    const coupon = UserCoupon.receive({
      userCouponId,
      userId: input.userId,
      couponId: input.couponId,
      organizationId: input.organizationId,
      expiresAt: input.expiresAt,
      receivedAt: new Date(),
    });
    await this.userCouponRepository.save(coupon);
    return { userCouponId };
  }
}
