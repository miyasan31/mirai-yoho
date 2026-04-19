import * as v from "valibot";

const editRoleSchema = v.picklist(["admin", "operator"] as const);

export const userEditRoleFormSchema = v.object({
  role: editRoleSchema,
});

export type UserEditRoleFormValues = v.InferOutput<
  typeof userEditRoleFormSchema
>;
