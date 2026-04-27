import { useGetAdminClients } from "@/generated/api/admin/admin";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminClients(options?: { enabled?: boolean }) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetAdminClients(organizationId ?? "", {
    query: {
      enabled: !!token && !!organizationId && enabled,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
