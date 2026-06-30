import { useGetAdminDashboard } from "@/generated/api/admin/admin";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

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
