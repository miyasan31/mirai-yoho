import type { BusinessHours } from "@mirai-yoho/shared/business-hours";

export type PersistedBusinessHours = ReturnType<BusinessHours["toJSON"]>;
export type PricePlanRange = { minTotalJPY: number; maxTotalJPY: number };
