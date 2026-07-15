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

const batchSizeSchema = v.pipe(
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

export const couponCreateFormSchema = v.object({
  type: couponTypeSchema,
  name: nameSchema,
  amountJPY: amountSchema,
  batchSize: batchSizeSchema,
  expiresInDays: expiresInDaysSchema,
});

export type CouponCreateFormValues = v.InferInput<
  typeof couponCreateFormSchema
>;

export const couponUpdateFormSchema = v.object({
  name: nameSchema,
  amountJPY: amountSchema,
  batchSize: batchSizeSchema,
});

export type CouponUpdateFormValues = v.InferInput<
  typeof couponUpdateFormSchema
>;
