import * as v from "valibot";

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

const exceptionDaySchema = v.object({
  id: v.string(),
  date: v.string(),
  isClosed: v.boolean(),
  startTime: halfHourTimeSchema,
  endTime: halfHourTimeSchema,
});

export const businessHoursFormSchema = v.object({
  includePublicHolidays: v.boolean(),
  weekly: v.array(weeklyRowSchema),
  exceptions: v.array(exceptionDaySchema),
});

export type BusinessHoursFormValues = v.InferOutput<
  typeof businessHoursFormSchema
>;
