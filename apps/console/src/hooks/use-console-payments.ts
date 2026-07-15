import { useGetConsolePayments } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsolePaymentsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsolePayments(params?: GetConsolePaymentsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsolePayments(organizationId ?? "", params, {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.payments.read"),
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
