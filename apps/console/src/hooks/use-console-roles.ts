import {
  getGetConsoleRolesQueryKey as getGeneratedAdminRolesQueryKey,
  useCreateConsoleRole,
  useDeleteConsoleRole,
  useGetConsoleRoles,
  useUpdateConsoleRole,
} from "@mirai-yoho/api-client/api/console/console";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useConsoleRoles() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleRoles(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.roles.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useConsoleRolesQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminRolesQueryKey(organizationId ?? "");
}

export { useCreateConsoleRole, useDeleteConsoleRole, useUpdateConsoleRole };
