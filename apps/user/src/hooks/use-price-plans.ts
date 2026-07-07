import { useGetBookingPricePlans } from "@mirai-yoho/api-client/api/booking/booking";
import type { GetBookingPricePlansParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

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
