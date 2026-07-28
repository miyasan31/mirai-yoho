import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
  RATING_COMMENT_MAX_LENGTH,
  ratingFormSchema,
} from "../-rating-form-schema";

const validValues = { score: 5, comment: "" };

describe("ratingFormSchema score", () => {
  it.each([1, 2, 3, 4, 5])("%i を受理する", (score) => {
    const result = v.safeParse(ratingFormSchema, { ...validValues, score });
    expect(result.success).toBe(true);
  });

  it("未選択（初期値 0）を拒否する", () => {
    const result = v.safeParse(ratingFormSchema, { ...validValues, score: 0 });
    expect(result.success).toBe(false);
    expect(result.issues?.[0].message).toBe("評価を選択してください");
  });

  it("6 を拒否する", () => {
    const result = v.safeParse(ratingFormSchema, { ...validValues, score: 6 });
    expect(result.success).toBe(false);
    expect(result.issues?.[0].message).toBe("評価は 5 段階で選択してください");
  });

  it("小数を拒否する", () => {
    const result = v.safeParse(ratingFormSchema, {
      ...validValues,
      score: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("文字列を拒否する", () => {
    const result = v.safeParse(ratingFormSchema, {
      ...validValues,
      score: "3",
    });
    expect(result.success).toBe(false);
  });
});

describe("ratingFormSchema comment", () => {
  it("空文字を受理する", () => {
    const result = v.safeParse(ratingFormSchema, validValues);
    expect(result.success).toBe(true);
  });

  it("前後の空白を取り除く", () => {
    const result = v.safeParse(ratingFormSchema, {
      ...validValues,
      comment: "  よかった  ",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.output.comment).toBe("よかった");
  });

  it(`${RATING_COMMENT_MAX_LENGTH} 文字を受理する`, () => {
    const result = v.safeParse(ratingFormSchema, {
      ...validValues,
      comment: "あ".repeat(RATING_COMMENT_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it(`${RATING_COMMENT_MAX_LENGTH + 1} 文字を拒否する`, () => {
    const result = v.safeParse(ratingFormSchema, {
      ...validValues,
      comment: "あ".repeat(RATING_COMMENT_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
    expect(result.issues?.[0].message).toBe(
      `コメントは ${RATING_COMMENT_MAX_LENGTH} 文字以内で入力してください`,
    );
  });
});
