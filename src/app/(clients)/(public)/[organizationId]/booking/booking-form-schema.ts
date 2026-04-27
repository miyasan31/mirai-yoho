import * as v from "valibot";
import {
  isFutureClientBirthdate,
  isValidClientBirthdateFormat,
} from "@/lib/client-birthdate";

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
  clientBirthdate: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "生年月日を入力してください"),
    v.check(
      (value) => isValidClientBirthdateFormat(value),
      "生年月日の形式が正しくありません",
    ),
    v.check(
      (value) => !isFutureClientBirthdate(value),
      "未来の日付は指定できません",
    ),
  ),
  consultantContent: v.optional(v.string()),
});

export type BookingFormValues = v.InferOutput<typeof bookingFormSchema>;
