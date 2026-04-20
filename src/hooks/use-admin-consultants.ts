import {
  useDeleteAdminConsultant,
  useGetAdminConsultants,
  useUpdateAdminConsultant,
} from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminConsultants(options?: { enabled?: boolean }) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetAdminConsultants(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId && enabled },
  });
}

export { useUpdateAdminConsultant, useDeleteAdminConsultant };
