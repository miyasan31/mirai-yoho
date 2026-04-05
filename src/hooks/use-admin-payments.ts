import { useGetAdminPayments } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminPayments() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminPayments(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}
