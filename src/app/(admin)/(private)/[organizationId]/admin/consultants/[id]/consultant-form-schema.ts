import * as v from "valibot";

export const consultantFormSchema = v.object({
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
  bio: v.optional(v.string()),
  phone: v.optional(v.pipe(v.string(), v.trim())),
  specialties: v.optional(v.string()),
});

export type ConsultantFormValues = v.InferOutput<typeof consultantFormSchema>;
