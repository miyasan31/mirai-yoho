import {
  useDeleteConsoleConsultant,
  useGetConsoleConsultants,
  useInviteConsultant,
  useUpdateConsoleConsultant,
} from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleConsultantsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useConsoleConsultants(
  params?: GetConsoleConsultantsParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleConsultants(organizationId ?? "", params, {
    query: {
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.consultants.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export {
  useInviteConsultant,
  useUpdateConsoleConsultant,
  useDeleteConsoleConsultant,
};
