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
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleAccounts(params?: GetConsoleAccountsParams) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsoleAccounts(organizationId ?? "", params, {
    query: {
      ...cachePolicy.normal,
      enabled: !!token && !!organizationId,
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
