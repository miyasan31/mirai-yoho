import * as v from "valibot";

export const bookingSettingsFormSchema = v.object({
  consultantSelectionEnabled: v.boolean(),
});

export type BookingSettingsFormValues = v.InferOutput<
  typeof bookingSettingsFormSchema
>;
