import { useGetAdminClients } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminClients() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminClients(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}
