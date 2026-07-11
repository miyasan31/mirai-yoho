import type { OrganizationSettings } from "@/domain/organization-settings/organization-settings";

export function toBookingSettingsResponse(settings: OrganizationSettings) {
  return {
    consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    businessHours: settings.getBusinessHours().toJSON(),
    pricePlanRange: settings.getPricePlanRange().toJSON(),
  };
}
