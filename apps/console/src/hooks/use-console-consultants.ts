import {
  useDeleteConsoleConsultant,
  useGetConsoleConsultants,
  useInviteConsultant,
  useUpdateConsoleConsultant,
} from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleConsultantsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleConsultants(
  params?: GetConsoleConsultantsParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleConsultants(organizationId ?? "", params, {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.consultants.read"),
    },
  });
}

export {
  useInviteConsultant,
  useUpdateConsoleConsultant,
  useDeleteConsoleConsultant,
};
