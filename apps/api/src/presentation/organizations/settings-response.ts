import type { Settings } from "@/domain/settings/settings";

export function toBookingSettingsResponse(settings: Settings) {
  return {
    businessHours: settings.getBusinessHours().toJSON(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}

export function toCompanyInfoResponse(settings: Settings) {
  return {
    companyInfo: settings.getCompanyInfo().toJSON(),
  };
}
