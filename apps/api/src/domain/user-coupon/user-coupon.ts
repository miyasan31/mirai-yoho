import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { CouponType } from "@/domain/coupon/coupon";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface UserCouponCreateProps {
  userCouponId: string;
  userId: string;
  couponId: string;
  organizationId: string;
  amountJPY: number;
  couponName: string;
  type: CouponType;
  receivedAt?: Date;
  expiresAt?: Date;
}

interface UserCouponReconstructProps {
  userCouponId: string;
  userId: string;
  couponId: string;
  organizationId: string;
  amountJPY: number;
  couponName: string;
  type: CouponType;
  receivedAt: Date;
  expiresAt?: Date;
  redeemedAt?: Date;
  redeemedBookingId?: string;
}

export class UserCoupon extends AggregateRoot {
  private constructor(
    private readonly userCouponId: string,
    private readonly userId: string,
    private readonly couponId: string,
    private readonly organizationId: string,
    private readonly amountJPY: number,
    private readonly couponName: string,
    private readonly type: CouponType,
    private readonly receivedAt: Date,
    private readonly expiresAt: Date | undefined,
    private redeemedAt: Date | undefined,
    private redeemedBookingId: string | undefined,
  ) {
    super();
  }

  static receive(props: UserCouponCreateProps): UserCoupon {
    return new UserCoupon(
      props.userCouponId,
      props.userId,
      props.couponId,
      props.organizationId,
      props.amountJPY,
      props.couponName,
      props.type,
      props.receivedAt ?? new Date(),
      props.expiresAt,
      undefined,
      undefined,
    );
  }

  static reconstruct(props: UserCouponReconstructProps): UserCoupon {
    return new UserCoupon(
      props.userCouponId,
      props.userId,
      props.couponId,
      props.organizationId,
      props.amountJPY,
      props.couponName,
      props.type,
      props.receivedAt,
      props.expiresAt,
      props.redeemedAt,
      props.redeemedBookingId,
    );
  }

  redeem(bookingId: string, now: Date): void {
    if (this.redeemedAt) {
      throw new DomainError(
        "COUPON_ALREADY_REDEEMED",
        "Coupon is already redeemed",
      );
    }
    if (this.expiresAt && now.getTime() >= this.expiresAt.getTime()) {
      throw new DomainError("COUPON_EXPIRED", "Coupon has expired");
    }
    this.redeemedAt = now;
    this.redeemedBookingId = bookingId;
  }

  restore(): void {
    if (!this.redeemedAt) {
      throw new DomainError(
        "COUPON_NOT_REDEEMED",
        "Coupon is not redeemed; nothing to restore",
      );
    }
    this.redeemedAt = undefined;
    this.redeemedBookingId = undefined;
  }

  isRedeemable(now: Date): boolean {
    if (this.redeemedAt) return false;
    if (this.expiresAt && now.getTime() >= this.expiresAt.getTime()) {
      return false;
    }
    return true;
  }

  getUserCouponId(): string {
    return this.userCouponId;
  }

  getUserId(): string {
    return this.userId;
  }

  getCouponId(): string {
    return this.couponId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getAmountJPY(): number {
    return this.amountJPY;
  }

  getCouponName(): string {
    return this.couponName;
  }

  getType(): CouponType {
    return this.type;
  }

  getReceivedAt(): Date {
    return this.receivedAt;
  }

  getExpiresAt(): Date | undefined {
    return this.expiresAt;
  }

  getRedeemedAt(): Date | undefined {
    return this.redeemedAt;
  }

  getRedeemedBookingId(): string | undefined {
    return this.redeemedBookingId;
  }
}
