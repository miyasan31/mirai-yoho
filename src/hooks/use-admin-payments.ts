import { useGetAdminPayments } from "@/generated/api/admin/admin";
import type { GetAdminPaymentsParams } from "@/generated/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminPayments(params?: GetAdminPaymentsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminPayments(organizationId ?? "", params, {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
