import * as v from "valibot";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// ハイフンあり・なしの国内番号を想定した緩めのチェック（+ 始まりの国際表記も許容）
const PHONE_NUMBER_PATTERN = /^\+?[\d-]{10,15}$/;

export const profileFormSchema = v.object({
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "名前を入力してください"),
  ),
  // Zoom 連携に必要なため必須項目とする
  primaryEmail: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が不正です"),
  ),
  // 予約時に必須のため必須項目とする
  phoneNumber: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "電話番号を入力してください"),
    v.check(
      (value) => PHONE_NUMBER_PATTERN.test(value),
      "電話番号の形式が不正です",
    ),
  ),
  birthDate: v.pipe(
    v.string(),
    v.regex(ISO_DATE_PATTERN, "YYYY-MM-DD 形式で入力してください"),
  ),
});

export type ProfileFormValues = v.InferOutput<typeof profileFormSchema>;
