import { useGetPricePlans } from "@mirai-yoho/api-client/api/booking/booking";
import type { GetPricePlansParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function usePricePlanOptions(
  params: GetPricePlansParams = {},
  enabled = true,
) {
  const { organizationId } = useOrganizationRouting();
  return useGetPricePlans(organizationId ?? "", params, {
    query: {
      enabled: enabled && !!organizationId,
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
