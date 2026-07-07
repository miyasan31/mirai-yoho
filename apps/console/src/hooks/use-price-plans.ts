import { useGetBookingPricePlans } from "@mirai-yoho/api-client/api/booking/booking";
import {
  useCreateConsultantPricePlan,
  useDeleteConsultantPricePlan,
  useListConsultantPricePlans,
  useUpdateConsultantPricePlan,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import type { GetBookingPricePlansParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useConsultantPricePlans() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useListConsultantPricePlans(organizationId ?? "", {
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

export {
  useCreateConsultantPricePlan,
  useDeleteConsultantPricePlan,
  useUpdateConsultantPricePlan,
};
