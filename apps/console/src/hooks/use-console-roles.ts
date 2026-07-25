import {
  getGetConsoleRolesQueryKey as getGeneratedAdminRolesQueryKey,
  useCreateConsoleRole,
  useDeleteConsoleRole,
  useGetConsoleRoles,
  useUpdateConsoleRole,
} from "@mirai-yoho/api-client/api/console/console";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleRoles() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleRoles(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token && !!organizationId && hasPermission("console.roles.read"),
    },
  });
}

export function useConsoleRolesQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminRolesQueryKey(organizationId ?? "");
}

export { useCreateConsoleRole, useDeleteConsoleRole, useUpdateConsoleRole };
