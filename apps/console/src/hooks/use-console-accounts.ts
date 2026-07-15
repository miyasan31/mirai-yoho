import {
  getGetConsoleAccountsQueryKey as getGeneratedAdminAccountsQueryKey,
  useDeleteConsoleAccount,
  useGetConsoleAccounts,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
} from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleAccountsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useConsoleAccounts(params?: GetConsoleAccountsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleAccounts(organizationId ?? "", params, {
    query: {
      enabled: !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useConsoleAccountsQueryKey() {
  const { organizationId } = useOrganizationRouting();
  return getGeneratedAdminAccountsQueryKey(organizationId ?? "");
}

export {
  useDeleteConsoleAccount,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
};
