import {
  isFutureCustomerBirthdate,
  isValidCustomerBirthdateFormat,
} from "@mirai-yoho/shared/customer-birthdate";
import * as v from "valibot";

const ADULT_AGE_YEARS = 18;

function isMinorBirthdate(birthDateIso: string, referenceDate: Date): boolean {
  const [year, month, day] = birthDateIso.split("-").map(Number);
  let age = referenceDate.getUTCFullYear() - year;
  const monthDiff = referenceDate.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < day)) {
    age -= 1;
  }
  return age < ADULT_AGE_YEARS;
}

export const bookingFormSchema = v.pipe(
  v.object({
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
    // 未成年 (18歳未満) の場合のみ必須。valibot の cross-field チェックで確認する
    guardianName: v.optional(v.pipe(v.string(), v.trim())),
    guardianConsent: v.optional(v.boolean()),
    agreedToTerms: v.pipe(
      v.boolean(),
      v.check(
        (value) => value === true,
        "利用規約およびキャンセルポリシーへの同意が必要です",
      ),
    ),
  }),
  v.forward(
    v.check(
      (values) =>
        !isMinorBirthdate(values.customerBirthDate, new Date()) ||
        (typeof values.guardianName === "string" &&
          values.guardianName.length > 0),
      "未成年者の予約には親権者の氏名が必要です",
    ),
    ["guardianName"],
  ),
  v.forward(
    v.check(
      (values) =>
        !isMinorBirthdate(values.customerBirthDate, new Date()) ||
        values.guardianConsent === true,
      "未成年者の予約には親権者の同意が必要です",
    ),
    ["guardianConsent"],
  ),
);

export type BookingFormValues = v.InferOutput<typeof bookingFormSchema>;
