import {
  useDeleteAdminConsultant,
  useGetAdminConsultants,
  useUpdateAdminConsultant,
} from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminConsultants() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminConsultants(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}

export { useUpdateAdminConsultant, useDeleteAdminConsultant };
