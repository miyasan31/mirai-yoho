import * as v from "valibot";

export const RATING_COMMENT_MAX_LENGTH = 1000;

export const ratingFormSchema = v.object({
  // 星は必須。未選択（初期値 0）は minValue で弾く
  score: v.pipe(
    v.number("評価を選択してください"),
    v.integer("評価を選択してください"),
    v.minValue(1, "評価を選択してください"),
    v.maxValue(5, "評価は 5 段階で選択してください"),
  ),
  // 任意入力。空文字を「コメントなし」として扱い、送信時に undefined へ変換する
  comment: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(
      RATING_COMMENT_MAX_LENGTH,
      `コメントは ${RATING_COMMENT_MAX_LENGTH} 文字以内で入力してください`,
    ),
  ),
});

export type RatingFormValues = v.InferOutput<typeof ratingFormSchema>;
