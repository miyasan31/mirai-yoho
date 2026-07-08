import {
  type GetSlotsQueryError,
  type GetSlotsQueryResult,
  useCreateSlot,
  useDeleteSlot,
  useGetSlots as useGeneratedGetSlots,
} from "@mirai-yoho/api-client/api/slot/slot";
import type { GetSlotsParams } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useGetSlots(
  params?: GetSlotsParams,
  options?: Record<string, unknown>,
) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetSlots<GetSlotsQueryResult, GetSlotsQueryError>(
    organizationId ?? "",
    params,
    {
      ...options,
      query: {
        ...((options?.query as Record<string, unknown> | undefined) ?? {}),
        staleTime:
          (options?.query as { staleTime?: number } | undefined)?.staleTime ??
          QUERY_STALE_TIME.short,
        enabled:
          ((options?.query as { enabled?: boolean } | undefined)?.enabled ??
            true) &&
          Boolean(organizationId),
      },
    },
  );
}

export { useCreateSlot, useDeleteSlot };
