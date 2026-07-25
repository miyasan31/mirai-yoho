import { useGetConsoleBookings } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleBookingsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleBookings(params?: GetConsoleBookingsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleBookings(organizationId ?? "", params, {
    query: {
      ...cachePolicy.short,
      enabled:
        !!token && !!organizationId && hasPermission("console.bookings.read"),
    },
  });
}
