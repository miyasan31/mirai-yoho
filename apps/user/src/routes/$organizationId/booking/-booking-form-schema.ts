import {
  isFutureCustomerBirthdate,
  isValidCustomerBirthdateFormat,
} from "@mirai-yoho/shared/customer-birthdate";
import * as v from "valibot";

export const bookingFormSchema = v.object({
  customerName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "お名前を入力してください"),
  ),
  customerEmail: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "メールアドレスを入力してください"),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  customerPhone: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "電話番号を入力してください"),
  ),
  customerBirthDate: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "生年月日を入力してください"),
    v.check(
      (value) => isValidCustomerBirthdateFormat(value),
      "生年月日の形式が正しくありません",
    ),
    v.check(
      (value) => !isFutureCustomerBirthdate(value),
      "未来の日付は指定できません",
    ),
  ),
  consultantContent: v.optional(v.string()),
  agreedToTerms: v.pipe(
    v.boolean(),
    v.check(
      (value) => value === true,
      "利用規約およびキャンセルポリシーへの同意が必要です",
    ),
  ),
});

export type BookingFormValues = v.InferOutput<typeof bookingFormSchema>;
