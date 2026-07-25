import {
  useGetPricePlans,
  useGetPricePlansSuspense,
} from "@mirai-yoho/api-client/api/booking/booking";
import type { GetPricePlansParams } from "@mirai-yoho/api-client/schemas";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function usePricePlanOptions(params: GetPricePlansParams) {
  const { organizationId } = useOrganizationRouting();
  return useGetPricePlans(organizationId ?? "", params, {
    query: {
      ...cachePolicy.short,
      enabled: !!organizationId && !!params.consultantId,
    },
  });
}

export function useSuspensePricePlanOptions(
  organizationId: string,
  params: GetPricePlansParams,
) {
  return useGetPricePlansSuspense(organizationId, params, {
    query: cachePolicy.short,
  });
}
