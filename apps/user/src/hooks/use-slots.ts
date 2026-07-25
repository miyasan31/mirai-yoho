import {
  type GetSlotsQueryError,
  type GetSlotsQueryResult,
  useGetSlots as useGeneratedGetSlots,
  useGetSlotsSuspense,
} from "@mirai-yoho/api-client/api/slot/slot";
import type { GetSlotsParams } from "@mirai-yoho/api-client/schemas";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function useGetSlots(
  params: GetSlotsParams,
  options?: Record<string, unknown>,
) {
  const { organizationId } = useOrganizationRouting();
  return useGeneratedGetSlots<GetSlotsQueryResult, GetSlotsQueryError>(
    organizationId ?? "",
    params,
    {
      ...options,
      query: {
        ...cachePolicy.short,
        ...((options?.query as Record<string, unknown> | undefined) ?? {}),
        enabled:
          ((options?.query as { enabled?: boolean } | undefined)?.enabled ??
            true) &&
          Boolean(organizationId) &&
          Boolean(params.consultantId),
      },
    },
  );
}

export function useSuspenseSlots(
  organizationId: string,
  params: GetSlotsParams,
) {
  return useGetSlotsSuspense(organizationId, params, {
    query: cachePolicy.short,
  });
}
