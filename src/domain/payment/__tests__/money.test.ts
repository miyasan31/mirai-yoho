import { describe, expect, it } from "vitest";
import { Money } from "@/domain/payment/money";
import { DomainError } from "@/domain/shared/domain-error";

describe("Money", () => {
  describe("create", () => {
    it("税額を正しく計算する（floor）", () => {
      const money = Money.create(10000, 0.1);
      expect(money.getAmountJPY()).toBe(10000);
      expect(money.getTaxAmountJPY()).toBe(1000);
      expect(money.getTaxRate()).toBe(0.1);
    });

    it("税額の端数は切り捨て", () => {
      const money = Money.create(999, 0.1);
      expect(money.getTaxAmountJPY()).toBe(99); // 999 * 0.1 = 99.9 → 99
    });

    it("getTotalJPY() は税込み合計を返す", () => {
      const money = Money.create(10000, 0.1);
      expect(money.getTotalJPY()).toBe(11000);
    });

    it("税率0%で税額は0円", () => {
      const money = Money.create(5000, 0);
      expect(money.getTaxAmountJPY()).toBe(0);
      expect(money.getTotalJPY()).toBe(5000);
    });

    it("負の金額で DomainError", () => {
      expect(() => Money.create(-1, 0.1)).toThrow(DomainError);
    });

    it("taxRate < 0 で DomainError", () => {
      expect(() => Money.create(1000, -0.1)).toThrow(DomainError);
    });

    it("taxRate > 1 で DomainError", () => {
      expect(() => Money.create(1000, 1.1)).toThrow(DomainError);
    });
  });

  describe("fromTaxIncluded", () => {
    it("税込金額から逆算する", () => {
      const money = Money.fromTaxIncluded(11000, 0.1);
      expect(money.getAmountJPY()).toBe(10000); // floor(11000 / 1.1) = 10000
      expect(money.getTaxAmountJPY()).toBe(1000);
      expect(money.getTotalJPY()).toBe(11000);
    });

    it("負の税込金額で DomainError", () => {
      expect(() => Money.fromTaxIncluded(-1, 0.1)).toThrow(DomainError);
    });

    it("不正な税率で DomainError", () => {
      expect(() => Money.fromTaxIncluded(1000, 1.5)).toThrow(DomainError);
    });
  });

  describe("equals", () => {
    it("同じ値で true を返す", () => {
      const m1 = Money.create(10000, 0.1);
      const m2 = Money.create(10000, 0.1);
      expect(m1.equals(m2)).toBe(true);
    });

    it("異なる金額で false を返す", () => {
      const m1 = Money.create(10000, 0.1);
      const m2 = Money.create(20000, 0.1);
      expect(m1.equals(m2)).toBe(false);
    });
  });
});
