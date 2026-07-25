import { DomainError } from "@mirai-yoho/shared/domain-error";
import { BirthDate } from "@/domain/user/birth-date";

const REFERENCE_DATE = new Date("2026-07-01T00:00:00Z");

describe("BirthDate", () => {
  describe("create", () => {
    it("18 歳ちょうどの誕生日で作成できる", () => {
      const birthDate = BirthDate.create("2008-07-01", REFERENCE_DATE);
      expect(birthDate.getValue()).toBe("2008-07-01");
    });

    it("18 歳より十分上で作成できる", () => {
      const birthDate = BirthDate.create("1990-01-01", REFERENCE_DATE);
      expect(birthDate.getAge(REFERENCE_DATE)).toBe(36);
    });

    it("18 歳未満でも作成できる (親権者同意フローで扱う)", () => {
      const birthDate = BirthDate.create("2009-01-01", REFERENCE_DATE);
      expect(birthDate.getValue()).toBe("2009-01-01");
      expect(birthDate.isMinor(REFERENCE_DATE)).toBe(true);
    });

    it("未来日は INVALID_BIRTH_DATE", () => {
      expect(() => BirthDate.create("2030-01-01", REFERENCE_DATE)).toThrow(
        DomainError,
      );
    });

    it("不正なフォーマットは INVALID_BIRTH_DATE", () => {
      expect(() => BirthDate.create("1990/01/01", REFERENCE_DATE)).toThrow(
        DomainError,
      );
      expect(() => BirthDate.create("not-a-date", REFERENCE_DATE)).toThrow(
        DomainError,
      );
    });
  });

  describe("reconstruct", () => {
    it("バリデーションをスキップして復元できる", () => {
      const birthDate = BirthDate.reconstruct("2009-01-01");
      expect(birthDate.getValue()).toBe("2009-01-01");
    });
  });

  describe("isMinor", () => {
    it("18 歳未満は true", () => {
      expect(BirthDate.isMinor("2009-01-01", REFERENCE_DATE)).toBe(true);
    });

    it("18 歳ちょうどは false", () => {
      expect(BirthDate.isMinor("2008-07-01", REFERENCE_DATE)).toBe(false);
    });

    it("成人年齢を大きく超えても false", () => {
      expect(BirthDate.isMinor("1990-01-01", REFERENCE_DATE)).toBe(false);
    });
  });

  describe("calculateAge", () => {
    it("誕生日前は1歳少ない", () => {
      const age = BirthDate.calculateAge(
        "1990-12-01",
        new Date("2026-07-01T00:00:00Z"),
      );
      expect(age).toBe(35);
    });

    it("誕生日以降は満年齢", () => {
      const age = BirthDate.calculateAge(
        "1990-01-01",
        new Date("2026-07-01T00:00:00Z"),
      );
      expect(age).toBe(36);
    });
  });

  describe("equals", () => {
    it("同じ日付なら true", () => {
      const a = BirthDate.reconstruct("1990-01-01");
      const b = BirthDate.reconstruct("1990-01-01");
      expect(a.equals(b)).toBe(true);
    });

    it("違う日付なら false", () => {
      const a = BirthDate.reconstruct("1990-01-01");
      const b = BirthDate.reconstruct("1990-01-02");
      expect(a.equals(b)).toBe(false);
    });
  });
});
