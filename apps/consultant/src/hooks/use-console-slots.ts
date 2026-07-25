import {
  type GetConsoleSlotsQueryError,
  type GetConsoleSlotsQueryResult,
  useGetConsoleSlots as useGeneratedGetConsoleSlots,
} from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleSlotsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useGetConsoleSlots(
  params: GetConsoleSlotsParams,
  options?: Record<string, unknown>,
) {
  const { isConsultant } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsoleSlots<
    GetConsoleSlotsQueryResult,
    GetConsoleSlotsQueryError
  >(organizationId ?? "", params, {
    ...options,
    query: {
      ...cachePolicy.short,
      ...((options?.query as Record<string, unknown> | undefined) ?? {}),
      enabled:
        ((options?.query as { enabled?: boolean } | undefined)?.enabled ??
          true) &&
        Boolean(organizationId) &&
        isConsultant,
    },
  });
}
