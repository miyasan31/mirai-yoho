import {
  useGetConsultantBookings,
  useJoinConsultantBooking,
  useUpdateConsultantMemo,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import type { GetConsultantBookingsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

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
