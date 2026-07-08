import * as v from "valibot";

export const memoFormSchema = v.object({
  customerName: v.optional(v.string()),
  birthDate: v.optional(v.string()),
  appraisalDate: v.optional(v.string()),
  freeMemo: v.optional(v.string()),
});

export type MemoFormValues = v.InferOutput<typeof memoFormSchema>;
