import * as v from "valibot";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MIN_NEW_EXCEPTION_LEAD_DAYS = 7;

export function getMinNewExceptionDate(): string {
  const jstMs =
    Date.now() +
    JST_OFFSET_MS +
    MIN_NEW_EXCEPTION_LEAD_DAYS * 24 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jstDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const halfHourTimeSchema = v.pipe(
  v.string(),
  v.regex(/^([01]\d|2[0-3]):([03]0)$/),
);

const weeklyRowSchema = v.object({
  dayOfWeek: v.number(),
  isClosed: v.boolean(),
  startTime: halfHourTimeSchema,
  endTime: halfHourTimeSchema,
});

const exceptionDaySchema = v.pipe(
  v.object({
    id: v.string(),
    isNew: v.boolean(),
    date: v.string(),
    isClosed: v.boolean(),
    startTime: halfHourTimeSchema,
    endTime: halfHourTimeSchema,
  }),
  v.check(
    (entry) => !entry.isNew || entry.date >= getMinNewExceptionDate(),
    "新規の単日例外は一週間先以降の日付で入力してください",
  ),
);

export const businessHoursFormSchema = v.object({
  includePublicHolidays: v.boolean(),
  weekly: v.array(weeklyRowSchema),
  exceptions: v.array(exceptionDaySchema),
});

export type BusinessHoursFormValues = v.InferOutput<
  typeof businessHoursFormSchema
>;
