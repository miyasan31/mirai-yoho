import { DomainError } from "@/domain/shared/domain-error";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";

describe("UserCoupon", () => {
  describe("receive", () => {
    it("受け取り時に redeemedAt は undefined", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
        receivedAt: new Date("2026-07-01T00:00:00Z"),
      });
      expect(coupon.getRedeemedAt()).toBeUndefined();
    });
  });

  describe("redeem", () => {
    it("予約 ID と利用日時が記録される", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
      });
      const now = new Date("2026-07-01T00:00:00Z");
      coupon.redeem("booking-1", now);
      expect(coupon.getRedeemedAt()).toEqual(now);
      expect(coupon.getRedeemedBookingId()).toBe("booking-1");
    });

    it("利用済みの再 redeem は DomainError", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
      });
      coupon.redeem("booking-1", new Date());
      expect(() => coupon.redeem("booking-2", new Date())).toThrow(DomainError);
    });

    it("有効期限切れは DomainError", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
        expiresAt: new Date("2026-06-30T00:00:00Z"),
      });
      expect(() =>
        coupon.redeem("booking-1", new Date("2026-07-01T00:00:00Z")),
      ).toThrow(DomainError);
    });
  });

  describe("isRedeemable", () => {
    it("未利用 + 期限内なら true", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
        expiresAt: new Date("2026-08-01T00:00:00Z"),
      });
      expect(coupon.isRedeemable(new Date("2026-07-01T00:00:00Z"))).toBe(true);
    });

    it("期限切れは false", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
        expiresAt: new Date("2026-06-30T00:00:00Z"),
      });
      expect(coupon.isRedeemable(new Date("2026-07-01T00:00:00Z"))).toBe(false);
    });

    it("利用済みは false", () => {
      const coupon = UserCoupon.receive({
        userCouponId: "uc-1",
        userId: "user-1",
        couponId: "coupon-1",
      });
      coupon.redeem("booking-1", new Date());
      expect(coupon.isRedeemable(new Date())).toBe(false);
    });
  });
});
