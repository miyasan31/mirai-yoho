import { useGetAdminBookings } from "@/generated/api/admin/admin";
import type { GetAdminBookingsParams } from "@/generated/schemas";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminBookings(params?: GetAdminBookingsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminBookings(organizationId ?? "", params, {
    query: { enabled: !!token && !!organizationId },
  });
}
