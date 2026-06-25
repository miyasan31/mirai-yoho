import { useGetAdminCustomers } from "@/generated/api/admin/admin";
import type { GetAdminCustomersParams } from "@/generated/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminCustomers(
  params?: GetAdminCustomersParams,
  options?: { enabled?: boolean },
) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetAdminCustomers(organizationId ?? "", params, {
    query: {
      enabled: !!token && !!organizationId && enabled,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
