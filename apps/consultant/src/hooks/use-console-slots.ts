import {
  type GetConsoleSlotsQueryError,
  type GetConsoleSlotsQueryResult,
  useGetConsoleSlots as useGeneratedGetConsoleSlots,
} from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleSlotsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useGetConsoleSlots(
  params?: GetConsoleSlotsParams,
  options?: Record<string, unknown>,
) {
  const { hasPermission, isConsultant } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetConsoleSlots<
    GetConsoleSlotsQueryResult,
    GetConsoleSlotsQueryError
  >(organizationId ?? "", params, {
    ...options,
    query: {
      ...((options?.query as Record<string, unknown> | undefined) ?? {}),
      staleTime:
        (options?.query as { staleTime?: number } | undefined)?.staleTime ??
        QUERY_STALE_TIME.short,
      enabled:
        ((options?.query as { enabled?: boolean } | undefined)?.enabled ??
          true) &&
        Boolean(organizationId) &&
        (isConsultant || hasPermission("console.slots.read")),
    },
  });
}
