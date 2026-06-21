import type { BusinessHours } from "@/domain/organization-settings/business-hours";

export type PersistedBusinessHours = ReturnType<BusinessHours["toJSON"]>;
export type PricePlanRange = { minTotalJPY: number; maxTotalJPY: number };
