import {
  useGetConsultantBookings,
  useJoinConsultantBooking,
  useUpdateConsultantMemo,
} from "@/generated/api/consultant/consultant";
import type { GetConsultantBookingsParams } from "@/generated/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useConsultantBookings(params?: GetConsultantBookingsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantBookings(organizationId ?? "", params, {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}

export { useJoinConsultantBooking, useUpdateConsultantMemo };
