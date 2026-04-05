import { useGetConsultants as useGeneratedGetConsultants } from "@/generated/api/consultant/consultant";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useGetConsultants(enabled = true) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsultants(organizationId ?? "", {
    query: { enabled: enabled && !!organizationId },
  });
}
