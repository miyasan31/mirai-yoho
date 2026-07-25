import {
  useArchivePricePlan,
  useCreatePricePlan,
  useListPricePlans,
  useUpdatePricePlan,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function usePricePlans() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useListPricePlans(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled: !!token && !!organizationId,
    },
  });
}

export { useArchivePricePlan, useCreatePricePlan, useUpdatePricePlan };
