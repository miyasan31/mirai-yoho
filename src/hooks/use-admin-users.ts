import {
  getGetAdminUsersQueryKey as getGeneratedAdminUsersQueryKey,
  useDeleteAdminUser,
  useGetAdminUsers,
  useInviteUser,
  useResendUserInvite,
  useResetUserPassword,
  useUpdateUserDisplayName,
  useUpdateUserRole,
} from "@/generated/api/admin/admin";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useAdminUsers() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminUsers(organizationId ?? "", {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useAdminUsersQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminUsersQueryKey(organizationId ?? "");
}

export {
  useDeleteAdminUser,
  useInviteUser,
  useResendUserInvite,
  useResetUserPassword,
  useUpdateUserDisplayName,
  useUpdateUserRole,
};
