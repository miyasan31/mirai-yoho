import {
  type GetAdminSlotsQueryError,
  type GetAdminSlotsQueryResult,
  useGetAdminSlots as useGeneratedGetAdminSlots,
} from "@mirai-yoho/api-client/api/admin/admin";
import type { GetAdminSlotsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useGetAdminSlots(
  params?: GetAdminSlotsParams,
  options?: Record<string, unknown>,
) {
  const { hasPermission, isConsultant } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetAdminSlots<
    GetAdminSlotsQueryResult,
    GetAdminSlotsQueryError
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
        (isConsultant || hasPermission("admin.slots.read")),
    },
  });
}
