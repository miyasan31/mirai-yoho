import { DomainError } from "@mirai-yoho/shared/domain-error";
import { Coupon } from "@/domain/coupon/coupon";

const baseWelcomeProps = {
  organizationId: "org-1",
  couponId: "coupon-welcome",
  type: "welcome" as const,
  name: "初回登録特典",
  amountJPY: 1000,
  batchSize: 10,
  expiresInDays: 90,
};

const baseBirthdayProps = {
  organizationId: "org-1",
  couponId: "coupon-birthday",
  type: "birthday" as const,
  name: "誕生月クーポン",
  amountJPY: 500,
  totalLimit: 1000,
  expiresInDays: 30,
};

describe("Coupon", () => {
  describe("create", () => {
    it("welcome クーポンを生成できる（batchSize 必須）", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      expect(coupon.getType()).toBe("welcome");
      expect(coupon.getBatchSize()).toBe(10);
      expect(coupon.getTotalLimit()).toBeUndefined();
    });

    it("birthday クーポンを生成できる（totalLimit 必須）", () => {
      const coupon = Coupon.create(baseBirthdayProps);
      expect(coupon.getType()).toBe("birthday");
      expect(coupon.getTotalLimit()).toBe(1000);
      expect(coupon.getBatchSize()).toBeUndefined();
    });

    it("amountJPY が 0 以下だと DomainError", () => {
      expect(() =>
        Coupon.create({ ...baseWelcomeProps, amountJPY: 0 }),
      ).toThrow(DomainError);
    });

    it("welcome に batchSize が無いと DomainError", () => {
      const props = { ...baseWelcomeProps } as unknown as {
        batchSize?: number;
      };
      delete props.batchSize;
      expect(() =>
        Coupon.create(props as unknown as typeof baseWelcomeProps),
      ).toThrow(DomainError);
    });

    it("welcome に totalLimit を設定すると DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseWelcomeProps,
          totalLimit: 100,
        } as unknown as typeof baseWelcomeProps),
      ).toThrow(DomainError);
    });

    it("birthday に totalLimit が無いと DomainError", () => {
      const props = { ...baseBirthdayProps } as unknown as {
        totalLimit?: number;
      };
      delete props.totalLimit;
      expect(() =>
        Coupon.create(props as unknown as typeof baseBirthdayProps),
      ).toThrow(DomainError);
    });

    it("birthday に batchSize を設定すると DomainError", () => {
      expect(() =>
        Coupon.create({
          ...baseBirthdayProps,
          batchSize: 3,
        } as unknown as typeof baseBirthdayProps),
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
  });

  describe("update", () => {
    it("welcome の updateBatchSize で枚数を変更できる", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.updateBatchSize(20);
      expect(coupon.getBatchSize()).toBe(20);
    });

    it("birthday に updateBatchSize すると DomainError", () => {
      const coupon = Coupon.create(baseBirthdayProps);
      expect(() => coupon.updateBatchSize(5)).toThrow(DomainError);
    });

    it("birthday の updateTotalLimit で上限を変更できる", () => {
      const coupon = Coupon.create(baseBirthdayProps);
      coupon.updateTotalLimit(2000);
      expect(coupon.getTotalLimit()).toBe(2000);
    });

    it("welcome に updateTotalLimit すると DomainError", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      expect(() => coupon.updateTotalLimit(500)).toThrow(DomainError);
    });
  });

  describe("archive / unarchive", () => {
    it("archive すると isActive は false", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.archive();
      expect(coupon.isArchived()).toBe(true);
      expect(coupon.isActive()).toBe(false);
    });

    it("unarchive で復活する", () => {
      const coupon = Coupon.create(baseWelcomeProps);
      coupon.archive();
      coupon.unarchive();
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
});
