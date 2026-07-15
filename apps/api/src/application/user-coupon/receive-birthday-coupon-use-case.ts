import { AppError } from "@/application/shared/app-error";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import type { IUserRepository } from "@/domain/user/user-repository";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";

export interface ReceiveBirthdayCouponInput {
  userId: string;
  organizationId: string;
}

export interface ReceiveBirthdayCouponOutput {
  issuedCount: number;
}

export class ReceiveBirthdayCouponUseCase {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    input: ReceiveBirthdayCouponInput,
  ): Promise<ReceiveBirthdayCouponOutput> {
    const now = new Date();

    const all = await this.couponRepository.findByOrganizationId(
      input.organizationId,
    );
    const birthday = all.find(
      (c) => c.getType() === "birthday" && !c.isArchived(),
    );
    if (!birthday) {
      throw new AppError(
        404,
        "BIRTHDAY_COUPON_NOT_CONFIGURED",
        "This organization does not offer a birthday coupon",
      );
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    const birthMonth = user.getBirthDate().getBirthMonth();
    if (birthMonth !== now.getMonth() + 1) {
      throw new AppError(
        400,
        "BIRTHDAY_COUPON_NOT_IN_MONTH",
        "Birthday coupon can only be received in your birth month",
      );
    }

    const existing = await this.userCouponRepository.findByUserIdAndCouponId(
      input.userId,
      birthday.getCouponId(),
    );
    const receivedThisMonth = existing.some((c) => {
      const receivedAt = c.getReceivedAt();
      return (
        receivedAt.getFullYear() === now.getFullYear() &&
        receivedAt.getMonth() === now.getMonth()
      );
    });
    if (receivedThisMonth) {
      throw new AppError(
        409,
        "BIRTHDAY_COUPON_ALREADY_RECEIVED_THIS_MONTH",
        "Birthday coupon has already been received this month",
      );
    }

    const expiresAt = birthday.calcExpiresAtFor(now);
    const coupons: UserCoupon[] = [];
    for (let i = 0; i < birthday.getBatchSize(); i++) {
      coupons.push(
        UserCoupon.receive({
          userCouponId: crypto.randomUUID(),
          userId: input.userId,
          couponId: birthday.getCouponId(),
          organizationId: input.organizationId,
          amountJPY: birthday.getAmountJPY(),
          couponName: birthday.getName(),
          type: "birthday",
          receivedAt: now,
          expiresAt,
        }),
      );
    }
    await this.userCouponRepository.saveMany(coupons);

    return { issuedCount: coupons.length };
  }
}
