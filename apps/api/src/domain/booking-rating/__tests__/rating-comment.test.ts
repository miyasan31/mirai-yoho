import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  RATING_COMMENT_MAX_LENGTH,
  RatingComment,
} from "@/domain/booking-rating/rating-comment";

describe("RatingComment", () => {
  it("create() は前後の空白を取り除く", () => {
    expect(RatingComment.create("  丁寧でした  ").getValue()).toBe(
      "丁寧でした",
    );
  });

  it("create() は空白のみの入力をコメントなしとして扱う", () => {
    expect(RatingComment.create("   ").isEmpty()).toBe(true);
  });

  it("empty() はコメントなしを表す", () => {
    expect(RatingComment.empty().isEmpty()).toBe(true);
    expect(RatingComment.empty().getValue()).toBe("");
  });

  it(`create() は ${RATING_COMMENT_MAX_LENGTH} 文字ちょうどを受け付ける`, () => {
    const value = "あ".repeat(RATING_COMMENT_MAX_LENGTH);
    expect(RatingComment.create(value).getValue()).toBe(value);
  });

  it(`create() は ${RATING_COMMENT_MAX_LENGTH + 1} 文字を拒否する`, () => {
    const value = "あ".repeat(RATING_COMMENT_MAX_LENGTH + 1);
    expect(() => RatingComment.create(value)).toThrow(DomainError);
    try {
      RatingComment.create(value);
    } catch (error) {
      expect((error as DomainError).code).toBe("INVALID_RATING_COMMENT");
    }
  });

  it("trim 後に上限以内になる入力は受け付ける", () => {
    const value = ` ${"あ".repeat(RATING_COMMENT_MAX_LENGTH)} `;
    expect(RatingComment.create(value).getValue().length).toBe(
      RATING_COMMENT_MAX_LENGTH,
    );
  });

  it("reconstruct() は検証を行わない", () => {
    const value = "あ".repeat(RATING_COMMENT_MAX_LENGTH + 1);
    expect(RatingComment.reconstruct(value).getValue()).toBe(value);
  });

  it("equals() は同じ内容で true を返す", () => {
    expect(
      RatingComment.create("よかった").equals(RatingComment.create("よかった")),
    ).toBe(true);
    expect(RatingComment.create("よかった").equals(RatingComment.empty())).toBe(
      false,
    );
  });
});
