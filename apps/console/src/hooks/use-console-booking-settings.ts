import {
  useGetConsoleBookingSettings,
  useGetConsoleConsultantStatuses,
  useUpdateConsoleBookingSettings,
  useUpdateConsoleConsultantStatuses,
} from "@mirai-yoho/api-client/api/console/console";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleBookingSettings() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleBookingSettings(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token && !!organizationId && hasPermission("console.settings.read"),
    },
  });
}

export function useConsoleConsultantStatuses() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleConsultantStatuses(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token && !!organizationId && hasPermission("console.settings.read"),
    },
  });
}

export { useUpdateConsoleBookingSettings, useUpdateConsoleConsultantStatuses };
