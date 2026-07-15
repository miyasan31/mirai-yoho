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

const positiveIntSchema = v.pipe(
  v.number("枚数を入力してください"),
  v.integer("整数で入力してください"),
  v.minValue(1, "1以上を入力してください"),
);

const expiresInDaysSchema = v.pipe(
  v.number("有効日数を入力してください"),
  v.integer("整数で入力してください"),
  v.minValue(1, "1日以上を入力してください"),
);

export const couponTypeSchema = v.picklist(
  ["welcome", "birthday"],
  "種別を選択してください",
);

export const couponCreateFormSchema = v.pipe(
  v.object({
    type: couponTypeSchema,
    name: nameSchema,
    amountJPY: amountSchema,
    batchSize: v.optional(positiveIntSchema),
    totalLimit: v.optional(positiveIntSchema),
    expiresInDays: expiresInDaysSchema,
  }),
  v.forward(
    v.check(({ type, batchSize }) => {
      if (type === "welcome") {
        return typeof batchSize === "number" && batchSize > 0;
      }
      return true;
    }, "welcome には 1 ユーザーへの配布枚数を入力してください"),
    ["batchSize"],
  ),
  v.forward(
    v.check(({ type, totalLimit }) => {
      if (type === "birthday") {
        return typeof totalLimit === "number" && totalLimit > 0;
      }
      return true;
    }, "birthday には全体の配布上限を入力してください"),
    ["totalLimit"],
  ),
);

export type CouponCreateFormValues = v.InferInput<
  typeof couponCreateFormSchema
>;

export const couponUpdateFormSchema = v.object({
  name: nameSchema,
  amountJPY: amountSchema,
  batchSize: v.optional(positiveIntSchema),
  totalLimit: v.optional(positiveIntSchema),
});

export type CouponUpdateFormValues = v.InferInput<
  typeof couponUpdateFormSchema
>;
