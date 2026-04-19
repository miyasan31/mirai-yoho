import * as v from "valibot";

const inviteRoleSchema = v.picklist(["admin", "operator"] as const);

export const userInviteFormSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
  role: inviteRoleSchema,
});

export type UserInviteFormValues = v.InferOutput<typeof userInviteFormSchema>;
