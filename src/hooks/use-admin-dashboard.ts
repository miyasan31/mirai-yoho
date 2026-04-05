import { useGetAdminDashboard } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminDashboard() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminDashboard(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}
