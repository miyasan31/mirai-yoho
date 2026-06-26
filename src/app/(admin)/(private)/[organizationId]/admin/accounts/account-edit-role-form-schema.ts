import * as v from "valibot";

const editRoleSchema = v.picklist(["admin", "operator"] as const);

export const accountEditRoleFormSchema = v.object({
  role: editRoleSchema,
});

export type AccountEditRoleFormValues = v.InferOutput<
  typeof accountEditRoleFormSchema
>;
