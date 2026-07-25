import { useGetConsolePayments } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsolePaymentsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsolePayments(params?: GetConsolePaymentsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsolePayments(organizationId ?? "", params, {
    query: {
      ...cachePolicy.short,
      enabled:
        !!token && !!organizationId && hasPermission("console.payments.read"),
    },
  });
}
