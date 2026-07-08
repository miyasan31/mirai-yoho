import {
  getGetAdminAccountsQueryKey as getGeneratedAdminAccountsQueryKey,
  useDeleteAdminAccount,
  useGetAdminAccounts,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
} from "@mirai-yoho/api-client/api/admin/admin";
import type { GetAdminAccountsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useAdminAccounts(params?: GetAdminAccountsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminAccounts(organizationId ?? "", params, {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useAdminAccountsQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminAccountsQueryKey(organizationId ?? "");
}

export {
  useDeleteAdminAccount,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
};
