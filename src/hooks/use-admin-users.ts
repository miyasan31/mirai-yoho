import {
  getGetAdminUsersQueryKey,
  useDeleteAdminUser,
  useGetAdminUsers,
  useInviteUser,
  useResendUserInvite,
  useResetUserPassword,
  useUpdateUserRole,
} from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";

export function useAdminUsers() {
  const { token } = useAuth();
  return useGetAdminUsers({ query: { enabled: !!token } });
}

export {
  getGetAdminUsersQueryKey,
  useDeleteAdminUser,
  useInviteUser,
  useResendUserInvite,
  useResetUserPassword,
  useUpdateUserRole,
};
