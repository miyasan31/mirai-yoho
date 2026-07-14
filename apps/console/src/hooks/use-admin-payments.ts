import { useGetAdminPayments } from "@mirai-yoho/api-client/api/admin/admin";
import type { GetAdminPaymentsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useAdminPayments(params?: GetAdminPaymentsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminPayments(organizationId ?? "", params, {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.payments.read"),
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
