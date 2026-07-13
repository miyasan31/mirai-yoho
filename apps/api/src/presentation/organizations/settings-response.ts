import type { Settings } from "@/domain/settings/settings";

export function toBookingSettingsResponse(settings: Settings) {
  return {
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    businessHours: settings.getBusinessHours().toJSON(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}
