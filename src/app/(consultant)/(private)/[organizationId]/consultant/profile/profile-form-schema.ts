import * as v from "valibot";

export const profileFormSchema = v.object({
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "表示名を入力してください"),
  ),
  bio: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  specialties: v.optional(v.string()),
});

export type ProfileFormValues = v.InferOutput<typeof profileFormSchema>;
