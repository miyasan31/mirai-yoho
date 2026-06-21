import * as v from "valibot";

export const consultantInviteFormSchema = v.object({
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  phone: v.optional(v.pipe(v.string(), v.trim())),
});

export type ConsultantInviteFormValues = v.InferOutput<
  typeof consultantInviteFormSchema
>;
