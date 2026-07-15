import * as v from "valibot";

const nameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "名称を入力してください"),
  v.maxLength(80, "80文字以内で入力してください"),
);

const amountSchema = v.pipe(
  v.number("金額を入力してください"),
  v.integer("整数で入力してください"),
  v.minValue(1, "1円以上を入力してください"),
);

const distributionCountSchema = v.pipe(
  v.number("枚数を入力してください"),
  v.integer("整数で入力してください"),
  v.minValue(1, "1以上を入力してください"),
);

export const couponTypeSchema = v.picklist(
  ["welcome", "birthday", "general"],
  "種別を選択してください",
);

export const couponCreateFormSchema = v.pipe(
  v.object({
    type: couponTypeSchema,
    name: nameSchema,
    amountJPY: amountSchema,
    distributionCount: distributionCountSchema,
    startsAt: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    expiresAt: v.optional(v.string()),
  }),
  v.forward(
    v.check(({ type, expiresInDays }) => {
      if (type === "welcome" || type === "birthday") {
        return typeof expiresInDays === "number" && expiresInDays > 0;
      }
      return true;
    }, "welcome / birthday には有効日数が必須です"),
    ["expiresInDays"],
  ),
  v.forward(
    v.check(({ type, expiresAt }) => {
      if (type === "general") {
        return typeof expiresAt === "string" && expiresAt.length > 0;
      }
      return true;
    }, "general クーポンには有効期限日時が必須です"),
    ["expiresAt"],
  ),
);

export type CouponCreateFormValues = v.InferInput<
  typeof couponCreateFormSchema
>;

export const couponUpdateFormSchema = v.object({
  name: nameSchema,
  amountJPY: amountSchema,
  distributionCount: distributionCountSchema,
});

export type CouponUpdateFormValues = v.InferInput<
  typeof couponUpdateFormSchema
>;
