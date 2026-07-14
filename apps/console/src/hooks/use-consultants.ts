import { useGetConsultants as useGeneratedGetConsultants } from "@mirai-yoho/api-client/api/consultant/consultant";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useGetConsultants(enabled = true) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsultants(organizationId ?? "", {
    query: {
      enabled: enabled && !!organizationId,
      staleTime: 0,
    },
  });
}
