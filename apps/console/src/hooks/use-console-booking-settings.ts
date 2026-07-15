import {
  useGetConsoleBookingSettings,
  useGetConsoleConsultantStatuses,
  useUpdateConsoleBookingSettings,
  useUpdateConsoleConsultantStatuses,
} from "@mirai-yoho/api-client/api/console/console";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

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
