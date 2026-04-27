import {
  useGetConsultantProfile,
  useUpdateConsultantProfile,
} from "@/generated/api/consultant/consultant";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useConsultantProfile() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantProfile(organizationId ?? "", {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export { useUpdateConsultantProfile };
