import { useGetConsoleBookings } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleBookingsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleBookings(params?: GetConsoleBookingsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleBookings(organizationId ?? "", params, {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.bookings.read"),
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
