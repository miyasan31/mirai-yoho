import type { ConsultantStatusProps } from "@/domain/settings/consultant-status";
import type { Settings } from "@/domain/settings/settings";

export function resolveConsultantStatus(
  settings: Settings,
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

export function toConsultantStatusesResponse(settings: Settings) {
  return {
    consultantStatuses: settings.getConsultantStatuses(),
    defaultConsultantStatusId: settings.getDefaultConsultantStatusId(),
  };
}
