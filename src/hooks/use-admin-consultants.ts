import {
  useDeleteAdminConsultant,
  useGetAdminConsultants,
  useUpdateAdminConsultant,
} from "@/generated/api/admin/admin";
import type { GetAdminConsultantsParams } from "@/generated/schemas";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminConsultants(
  params?: GetAdminConsultantsParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetAdminConsultants(organizationId ?? "", params, {
    query: {
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("admin.consultants.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export { useUpdateAdminConsultant, useDeleteAdminConsultant };
