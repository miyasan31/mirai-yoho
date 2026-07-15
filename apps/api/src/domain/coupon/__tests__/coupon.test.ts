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

const baseBirthdayProps = {
  organizationId: "org-1",
  couponId: "coupon-birthday",
  type: "birthday" as const,
  name: "誕生月クーポン",
  amountJPY: 500,
  distributionCount: 1000,
  expiresInDays: 30,
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
      expect(coupon.isArchived()).toBe(false);
    });

    it("birthday クーポンを生成できる", () => {
      const coupon = Coupon.create(baseBirthdayProps);
      expect(coupon.getType()).toBe("birthday");
      expect(coupon.getExpiresInDays()).toBe(30);
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

    it("expiresInDays が 0 以下だと DomainError", () => {
      expect(() =>
        Coupon.create({ ...baseWelcomeProps, expiresInDays: 0 }),
      ).toThrow(DomainError);
    });

    it("未知の type は DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseWelcomeProps,
          type: "invalid" as unknown as "welcome",
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
      expect(coupon.isActive()).toBe(false);
    });

    it("unarchive で復活する", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.archive();
      coupon.unarchive();
      expect(coupon.isArchived()).toBe(false);
      expect(coupon.isActive()).toBe(true);
    });
  });

  describe("calcExpiresAtFor", () => {
    it("受け取り日から expiresInDays 日後の Date を返す", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      const receivedAt = new Date("2026-07-01T00:00:00Z");
      const expiresAt = coupon.calcExpiresAtFor(receivedAt);
      expect(expiresAt.getTime()).toBe(
        receivedAt.getTime() + 90 * 24 * 60 * 60 * 1000,
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
