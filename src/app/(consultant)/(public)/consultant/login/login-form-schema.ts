import * as v from "valibot";

export const loginFormSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  password: v.pipe(v.string(), v.minLength(1, "パスワードを入力してください")),
});

export type LoginFormValues = v.InferOutput<typeof loginFormSchema>;
