import type { ConsultantStatusProps } from "@/domain/organization-settings/consultant-status";
import type { OrganizationSettings } from "@/domain/organization-settings/organization-settings";

export function resolveConsultantStatus(
  settings: OrganizationSettings,
  statusId: string,
): ConsultantStatusProps {
  return (
    settings.findConsultantStatus(statusId) ??
    settings.findConsultantStatus(settings.getDefaultConsultantStatusId()) ??
    settings.getConsultantStatuses()[0]
  );
}

export function toConsultantStatusResponse(status: ConsultantStatusProps) {
  return {
    statusId: status.statusId,
    name: status.name,
  };
}

export function toConsultantStatusesResponse(settings: OrganizationSettings) {
  return {
    consultantStatuses: settings.getConsultantStatuses(),
    defaultConsultantStatusId: settings.getDefaultConsultantStatusId(),
  };
}
