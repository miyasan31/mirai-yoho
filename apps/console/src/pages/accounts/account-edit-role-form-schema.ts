import * as v from "valibot";

export const accountEditRoleFormSchema = v.object({
  roleId: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "ロールを選択してください"),
  ),
});

export type AccountEditRoleFormValues = v.InferOutput<
  typeof accountEditRoleFormSchema
>;
