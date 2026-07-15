import { useGetConsoleDashboard } from "@mirai-yoho/api-client/api/console/console";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleDashboard() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleDashboard(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.dashboard.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
