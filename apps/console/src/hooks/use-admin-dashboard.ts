import { useGetAdminDashboard } from "@mirai-yoho/api-client/api/admin/admin";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useAdminDashboard() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminDashboard(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.dashboard.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
