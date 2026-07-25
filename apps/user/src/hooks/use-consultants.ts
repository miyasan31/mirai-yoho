import { useGetConsultants as useGeneratedGetConsultants } from "@mirai-yoho/api-client/api/consultant/consultant";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useGetConsultants(enabled = true) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsultants(organizationId ?? "", {
    query: {
      enabled: enabled && !!organizationId,
      staleTime: cachePolicy.normal.staleTime,
      gcTime: cachePolicy.normal.gcTime,
    },
  });
}
