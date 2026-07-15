import { useGetBookingPricePlans } from "@mirai-yoho/api-client/api/booking/booking";
import {
  useArchivePricePlan,
  useCreatePricePlan,
  useListPricePlans,
  useUpdatePricePlan,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import type { GetBookingPricePlansParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function usePricePlans() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useListPricePlans(organizationId ?? "", {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useBookingPricePlans(
  params: GetBookingPricePlansParams,
  enabled = true,
) {
  const { organizationId } = useOrganizationRouting();
  return useGetBookingPricePlans(organizationId ?? "", params, {
    query: {
      enabled: enabled && !!organizationId,
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}

export { useArchivePricePlan, useCreatePricePlan, useUpdatePricePlan };
