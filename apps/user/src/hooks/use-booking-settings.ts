import { useGetPublicSettings } from "@mirai-yoho/api-client/api/settings/settings";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function usePublicBookingSettings() {
  const { organizationId } = useOrganizationRouting();
  return useGetPublicSettings(organizationId ?? "", {
    query: {
      enabled: !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}
