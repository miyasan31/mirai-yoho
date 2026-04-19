import * as v from "valibot";

export const bookingFormSchema = v.object({
  clientName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "お名前を入力してください"),
  ),
  clientEmail: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  clientPhone: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "電話番号を入力してください"),
  ),
  consultantContent: v.optional(v.string()),
});

export type BookingFormValues = v.InferOutput<typeof bookingFormSchema>;
