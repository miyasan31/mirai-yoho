import { useGetConsoleCustomers } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleCustomersParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleCustomers(
  params?: GetConsoleCustomersParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleCustomers(organizationId ?? "", params, {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.customers.read"),
    },
  });
}
