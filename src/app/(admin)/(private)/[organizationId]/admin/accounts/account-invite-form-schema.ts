import * as v from "valibot";

export const accountInviteFormSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
  role: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "ロールを選択してください"),
  ),
});

export type AccountInviteFormValues = v.InferOutput<
  typeof accountInviteFormSchema
>;
