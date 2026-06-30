import { useGetAdminBookings } from "@/generated/api/admin/admin";
import type { GetAdminBookingsParams } from "@/generated/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

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
