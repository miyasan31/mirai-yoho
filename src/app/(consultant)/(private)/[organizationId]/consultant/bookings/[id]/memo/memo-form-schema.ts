import * as v from "valibot";

export const memoFormSchema = v.object({
  memo: v.optional(v.string()),
});

export type MemoFormValues = v.InferOutput<typeof memoFormSchema>;
