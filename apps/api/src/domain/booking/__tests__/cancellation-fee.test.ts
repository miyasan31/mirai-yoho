import { DomainError } from "@mirai-yoho/shared/domain-error";
import { CancellationFee } from "@/domain/booking/cancellation-fee";

describe("CancellationFee", () => {
  describe("none", () => {
    it("金額は 0", () => {
      const fee = CancellationFee.none();
      expect(fee.getAmountJPY()).toBe(0);
      expect(fee.isNone()).toBe(true);
      expect(fee.isFull()).toBe(false);
    });
  });

  describe("full", () => {
    it("指定金額で作成できる", () => {
      const fee = CancellationFee.full(5500);
      expect(fee.getAmountJPY()).toBe(5500);
      expect(fee.isFull()).toBe(true);
      expect(fee.isNone()).toBe(false);
    });

    it("負の金額は DomainError", () => {
      expect(() => CancellationFee.full(-1)).toThrow(DomainError);
    });

    it("0円 full も許容する（クーポン全額適用等）", () => {
      const fee = CancellationFee.full(0);
      expect(fee.isFull()).toBe(true);
      expect(fee.getAmountJPY()).toBe(0);
    });
  });

  describe("reconstruct", () => {
    it("永続層からの復元ができる", () => {
      const fee = CancellationFee.reconstruct("full", 3000);
      expect(fee.getType()).toBe("full");
      expect(fee.getAmountJPY()).toBe(3000);
    });

    it("不正な type は DomainError", () => {
      expect(() => CancellationFee.reconstruct("partial", 100)).toThrow(
        DomainError,
      );
    });
  });

  describe("equals", () => {
    it("同じ type & 金額なら true", () => {
      expect(
        CancellationFee.full(1000).equals(CancellationFee.full(1000)),
      ).toBe(true);
      expect(CancellationFee.none().equals(CancellationFee.none())).toBe(true);
    });

    it("type または金額が違えば false", () => {
      expect(
        CancellationFee.full(1000).equals(CancellationFee.full(2000)),
      ).toBe(false);
      expect(CancellationFee.full(0).equals(CancellationFee.none())).toBe(
        false,
      );
    });
  });
});
