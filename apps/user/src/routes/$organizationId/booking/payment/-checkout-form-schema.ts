import * as v from "valibot";

export const checkoutFormSchema = v.object({});

export type CheckoutFormValues = v.InferOutput<typeof checkoutFormSchema>;
