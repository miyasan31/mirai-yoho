import { useGetConsultants as useGeneratedGetConsultants } from "@/generated/api/consultant/consultant";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useGetConsultants(enabled = true) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsultants(organizationId ?? "", {
    query: {
      enabled: enabled && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
