import { useGetAdminBookings } from "@mirai-yoho/api-client/api/admin/admin";
import type { GetAdminBookingsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useAdminBookings(params?: GetAdminBookingsParams) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminBookings(organizationId ?? "", params, {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.bookings.read"),
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
