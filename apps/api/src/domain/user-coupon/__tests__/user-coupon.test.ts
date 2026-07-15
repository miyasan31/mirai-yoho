import { DomainError } from "@mirai-yoho/shared/domain-error";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";

const baseProps = {
  userCouponId: "uc-1",
  userId: "user-1",
  couponId: "coupon-1",
  organizationId: "org-1",
  amountJPY: 1000,
  couponName: "初回登録特典",
  type: "welcome" as const,
};

describe("UserCoupon", () => {
  describe("receive", () => {
    it("受け取り時に redeemedAt は undefined", () => {
      const coupon = UserCoupon.receive({
        ...baseProps,
        receivedAt: new Date("2026-07-01T00:00:00Z"),
      });
      expect(coupon.getRedeemedAt()).toBeUndefined();
      expect(coupon.getAmountJPY()).toBe(1000);
      expect(coupon.getCouponName()).toBe("初回登録特典");
      expect(coupon.getType()).toBe("welcome");
      expect(coupon.getOrganizationId()).toBe("org-1");
    });
  });

  describe("redeem", () => {
    it("予約 ID と利用日時が記録される", () => {
      const coupon = UserCoupon.receive(baseProps);
      const now = new Date("2026-07-01T00:00:00Z");
      coupon.redeem("booking-1", now);
      expect(coupon.getRedeemedAt()).toEqual(now);
      expect(coupon.getRedeemedBookingId()).toBe("booking-1");
    });

    it("利用済みの再 redeem は DomainError", () => {
      const coupon = UserCoupon.receive(baseProps);
      coupon.redeem("booking-1", new Date());
      expect(() => coupon.redeem("booking-2", new Date())).toThrow(DomainError);
    });

    it("有効期限切れは DomainError", () => {
      const coupon = UserCoupon.receive({
        ...baseProps,
        expiresAt: new Date("2026-06-30T00:00:00Z"),
      });
      expect(() =>
        coupon.redeem("booking-1", new Date("2026-07-01T00:00:00Z")),
      ).toThrow(DomainError);
    });
  });

  describe("restore", () => {
    it("redeem 済みなら未使用状態に戻せる", () => {
      const coupon = UserCoupon.receive(baseProps);
      coupon.redeem("booking-1", new Date("2026-07-01T00:00:00Z"));
      coupon.restore();
      expect(coupon.getRedeemedAt()).toBeUndefined();
      expect(coupon.getRedeemedBookingId()).toBeUndefined();
      expect(coupon.isRedeemable(new Date("2026-07-02T00:00:00Z"))).toBe(true);
    });

    it("redeem されていないと DomainError", () => {
      const coupon = UserCoupon.receive(baseProps);
      expect(() => coupon.restore()).toThrow(DomainError);
    });
  });

  describe("isRedeemable", () => {
    it("未利用 + 期限内なら true", () => {
      const coupon = UserCoupon.receive({
        ...baseProps,
        expiresAt: new Date("2026-08-01T00:00:00Z"),
      });
      expect(coupon.isRedeemable(new Date("2026-07-01T00:00:00Z"))).toBe(true);
    });

    it("期限切れは false", () => {
      const coupon = UserCoupon.receive({
        ...baseProps,
        expiresAt: new Date("2026-06-30T00:00:00Z"),
      });
      expect(coupon.isRedeemable(new Date("2026-07-01T00:00:00Z"))).toBe(false);
    });

    it("利用済みは false", () => {
      const coupon = UserCoupon.receive(baseProps);
      coupon.redeem("booking-1", new Date());
      expect(coupon.isRedeemable(new Date())).toBe(false);
    });
  });
});
