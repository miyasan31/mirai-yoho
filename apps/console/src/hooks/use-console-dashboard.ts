import { useGetConsoleDashboard } from "@mirai-yoho/api-client/api/console/console";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleDashboard() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleDashboard(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token && !!organizationId && hasPermission("console.dashboard.read"),
    },
  });
}
