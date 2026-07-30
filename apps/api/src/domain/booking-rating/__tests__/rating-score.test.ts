import { DomainError } from "@mirai-yoho/shared/domain-error";
import { RatingScore } from "@/domain/booking-rating/rating-score";

describe("RatingScore", () => {
  it.each([1, 2, 3, 4, 5])("create() は %i を受け付ける", (value) => {
    expect(RatingScore.create(value).getValue()).toBe(value);
  });

  it.each([0, 6, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "create() は %p を拒否する",
    (value) => {
      expect(() => RatingScore.create(value)).toThrow(DomainError);
      try {
        RatingScore.create(value);
      } catch (error) {
        expect((error as DomainError).code).toBe("INVALID_RATING_SCORE");
      }
    },
  );

  it("reconstruct() は検証を行わない", () => {
    expect(RatingScore.reconstruct(3).getValue()).toBe(3);
  });

  it("equals() は同じスコアで true を返す", () => {
    expect(RatingScore.create(4).equals(RatingScore.create(4))).toBe(true);
    expect(RatingScore.create(4).equals(RatingScore.create(5))).toBe(false);
  });
});
