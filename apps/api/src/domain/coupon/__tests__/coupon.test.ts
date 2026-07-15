import { DomainError } from "@mirai-yoho/shared/domain-error";
import { Coupon } from "@/domain/coupon/coupon";

const baseWelcomeProps = {
  organizationId: "org-1",
  couponId: "coupon-welcome",
  type: "welcome" as const,
  name: "初回登録特典",
  amountJPY: 1000,
  distributionCount: 10,
  expiresInDays: 90,
};

const baseGeneralProps = {
  organizationId: "org-1",
  couponId: "coupon-general",
  type: "general" as const,
  name: "春のキャンペーン",
  amountJPY: 500,
  distributionCount: 100,
  expiresAt: new Date("2026-12-31T14:59:59Z"),
};

describe("Coupon", () => {
  describe("create", () => {
    it("welcome クーポンを生成できる", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      expect(coupon.getType()).toBe("welcome");
      expect(coupon.getName()).toBe("初回登録特典");
      expect(coupon.getAmountJPY()).toBe(1000);
      expect(coupon.getDistributionCount()).toBe(10);
      expect(coupon.getExpiresInDays()).toBe(90);
      expect(coupon.getExpiresAt()).toBeUndefined();
      expect(coupon.isArchived()).toBe(false);
    });

    it("general クーポンを生成できる", () => {
      const coupon = Coupon.create(baseGeneralProps);
      expect(coupon.getType()).toBe("general");
      expect(coupon.getExpiresAt()).toEqual(baseGeneralProps.expiresAt);
    });

    it("amountJPY が 0 以下だと DomainError", () => {
      expect(() =>
        Coupon.create({ ...baseWelcomeProps, amountJPY: 0 }),
      ).toThrow(DomainError);
    });

    it("distributionCount が 0 以下だと DomainError", () => {
      expect(() =>
        Coupon.create({ ...baseWelcomeProps, distributionCount: 0 }),
      ).toThrow(DomainError);
    });

    it("空文字の name は DomainError", () => {
      expect(() => Coupon.create({ ...baseWelcomeProps, name: "   " })).toThrow(
        DomainError,
      );
    });

    it("80文字を超える name は DomainError", () => {
      expect(() =>
        Coupon.create({ ...baseWelcomeProps, name: "あ".repeat(81) }),
      ).toThrow(DomainError);
    });

    it("welcome に expiresInDays が無いと DomainError", () => {
      const props = { ...baseWelcomeProps } as unknown as {
        expiresInDays?: number;
      };
      delete props.expiresInDays;
      expect(() =>
        Coupon.create(props as unknown as typeof baseWelcomeProps),
      ).toThrow(DomainError);
    });

    it("welcome に expiresAt を設定すると DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseWelcomeProps,
          expiresAt: new Date("2026-12-31T14:59:59Z"),
        }),
      ).toThrow(DomainError);
    });

    it("general に expiresInDays を設定すると DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseGeneralProps,
          expiresInDays: 30,
        }),
      ).toThrow(DomainError);
    });

    it("general の startsAt が expiresAt 以降だと DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseGeneralProps,
          startsAt: new Date("2027-01-01T00:00:00Z"),
        }),
      ).toThrow(DomainError);
    });
  });

  describe("update", () => {
    it("rename で名前を変更できる", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.rename("新しい名前");
      expect(coupon.getName()).toBe("新しい名前");
    });

    it("updateAmount で金額を変更できる", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.updateAmount(2000);
      expect(coupon.getAmountJPY()).toBe(2000);
    });

    it("updateDistributionCount で枚数を変更できる", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.updateDistributionCount(20);
      expect(coupon.getDistributionCount()).toBe(20);
    });
  });

  describe("archive / unarchive", () => {
    it("archive すると archivedAt がセットされ、isActive は false", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.archive();
      expect(coupon.isArchived()).toBe(true);
      expect(coupon.isActive(new Date())).toBe(false);
    });

    it("unarchive で復活する", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.archive();
      coupon.unarchive();
      expect(coupon.isArchived()).toBe(false);
      expect(coupon.isActive(new Date())).toBe(true);
    });
  });

  describe("isActive", () => {
    it("startsAt 前は false", () => {
      const coupon = Coupon.create({
        ...baseGeneralProps,
        startsAt: new Date("2026-08-01T00:00:00Z"),
      });
      expect(coupon.isActive(new Date("2026-07-31T23:59:59Z"))).toBe(false);
      expect(coupon.isActive(new Date("2026-08-01T00:00:01Z"))).toBe(true);
    });

    it("expiresAt 以降は false", () => {
      const coupon = Coupon.create(baseGeneralProps);
      expect(coupon.isActive(baseGeneralProps.expiresAt)).toBe(false);
      expect(
        coupon.isActive(new Date(baseGeneralProps.expiresAt.getTime() - 1000)),
      ).toBe(true);
    });
  });

  describe("calcExpiresAtFor", () => {
    it("welcome は receivedAt + expiresInDays 日", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      const receivedAt = new Date("2026-07-01T00:00:00Z");
      const expiresAt = coupon.calcExpiresAtFor(receivedAt);
      expect(expiresAt?.getTime()).toBe(
        receivedAt.getTime() + 90 * 24 * 60 * 60 * 1000,
      );
    });

    it("general は固定 expiresAt を返す", () => {
      const coupon = Coupon.create(baseGeneralProps);
      expect(coupon.calcExpiresAtFor(new Date("2026-07-01T00:00:00Z"))).toEqual(
        baseGeneralProps.expiresAt,
      );
    });
  });

  describe("reconstruct", () => {
    it("永続化から復元できる", () => {
      const now = new Date("2026-07-15T00:00:00Z");
      const coupon = Coupon.reconstruct({
        ...baseWelcomeProps,
        createdAt: now,
        updatedAt: now,
        archivedAt: undefined,
      });
      expect(coupon.getCouponId()).toBe(baseWelcomeProps.couponId);
      expect(coupon.getCreatedAt()).toEqual(now);
    });
  });
});
