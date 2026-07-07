import { useGetAdminCustomers } from "@mirai-yoho/api-client/api/admin/admin";
import type { GetAdminCustomersParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminCustomers(
  params?: GetAdminCustomersParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetAdminCustomers(organizationId ?? "", params, {
    query: {
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("admin.customers.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
