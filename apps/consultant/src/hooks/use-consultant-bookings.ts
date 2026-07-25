import {
  useGetConsultantBookings,
  useJoinConsultantBooking,
  useUpdateConsultantMemo,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import type { GetConsultantBookingsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantBookings(params?: GetConsultantBookingsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantBookings(organizationId ?? "", params, {
    query: {
      ...cachePolicy.short,
      enabled: !!token && !!organizationId,
    },
  });
}

export { useJoinConsultantBooking, useUpdateConsultantMemo };
