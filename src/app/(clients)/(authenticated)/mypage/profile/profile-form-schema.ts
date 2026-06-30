import * as v from "valibot";

const MIN_AGE_YEARS = 18;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function calculateAge(birthDateIso: string, referenceDate: Date): number {
  const [year, month, day] = birthDateIso.split("-").map(Number);
  let age = referenceDate.getUTCFullYear() - year;
  const monthDiff = referenceDate.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < day)) {
    age -= 1;
  }
  return age;
}

export const profileFormSchema = v.object({
  displayName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "名前を入力してください"),
  ),
  primaryEmail: v.optional(
    v.pipe(v.string(), v.trim(), v.email("メールアドレスの形式が不正です")),
  ),
  birthDate: v.pipe(
    v.string(),
    v.regex(ISO_DATE_PATTERN, "YYYY-MM-DD 形式で入力してください"),
    v.check(
      (value) => calculateAge(value, new Date()) >= MIN_AGE_YEARS,
      "18歳未満は登録できません",
    ),
  ),
});

export type ProfileFormValues = v.InferOutput<typeof profileFormSchema>;
