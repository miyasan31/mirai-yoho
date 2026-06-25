import * as v from "valibot";

export const userEditDisplayNameFormSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
});

export type UserEditDisplayNameFormValues = v.InferOutput<
  typeof userEditDisplayNameFormSchema
>;
