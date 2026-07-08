import {
  getGetAdminRolesQueryKey as getGeneratedAdminRolesQueryKey,
  useCreateAdminRole,
  useDeleteAdminRole,
  useGetAdminRoles,
  useUpdateAdminRole,
} from "@mirai-yoho/api-client/api/admin/admin";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

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
