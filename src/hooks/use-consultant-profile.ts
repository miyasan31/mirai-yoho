import {
  useGetConsultantProfile,
  useUpdateConsultantProfile,
} from "@/generated/api/consultant/consultant";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useConsultantProfile() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantProfile(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}

export { useUpdateConsultantProfile };
