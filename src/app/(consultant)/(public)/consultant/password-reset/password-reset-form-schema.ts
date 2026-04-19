import * as v from "valibot";

export const passwordResetFormSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
});

export type PasswordResetFormValues = v.InferOutput<
  typeof passwordResetFormSchema
>;
