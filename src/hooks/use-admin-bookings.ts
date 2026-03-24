import { useGetAdminBookings } from "@/generated/api/admin/admin";
import type { GetAdminBookingsParams } from "@/generated/schemas";
import { useAuth } from "@/hooks/use-auth";

export function useAdminBookings(params?: GetAdminBookingsParams) {
  const { token } = useAuth();
  return useGetAdminBookings(params, { query: { enabled: !!token } });
}
