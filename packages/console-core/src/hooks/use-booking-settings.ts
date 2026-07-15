import {
  useGetConsoleBookingSettings,
  useGetConsoleConsultantStatuses,
  useUpdateConsoleBookingSettings,
  useUpdateConsoleConsultantStatuses,
} from "@mirai-yoho/api-client/api/console/console";
import { useGetPublicSettings } from "@mirai-yoho/api-client/api/settings/settings";
import { QUERY_STALE_TIME } from "./query-cache-policy";
import { useAuth } from "./use-auth";
import { useOrganizationRouting } from "./use-organization-routing";

export function usePublicBookingSettings() {
  const { organizationId } = useOrganizationRouting();
  return useGetPublicSettings(organizationId ?? "", {
    query: {
      enabled: !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useConsoleBookingSettings() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleBookingSettings(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.settings.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useConsoleConsultantStatuses() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleConsultantStatuses(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.settings.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export { useUpdateConsoleBookingSettings, useUpdateConsoleConsultantStatuses };
