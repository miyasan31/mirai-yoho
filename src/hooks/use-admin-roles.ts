import {
  getGetAdminRolesQueryKey as getGeneratedAdminRolesQueryKey,
  useCreateAdminRole,
  useDeleteAdminRole,
  useGetAdminRoles,
  useUpdateAdminRole,
} from "@/generated/api/admin/admin";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminRoles() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminRoles(organizationId ?? "", {
    query: {
      enabled: !!token && !!organizationId && hasPermission("admin.roles.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useAdminRolesQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminRolesQueryKey(organizationId ?? "");
}

export { useCreateAdminRole, useDeleteAdminRole, useUpdateAdminRole };
