import { useGetPublicSettings } from "@mirai-yoho/api-client/api/settings/settings";
import { cachePolicy } from "../query/cache-policy";
import { useOrganizationRouting } from "./use-organization-routing";

export function usePublicBookingSettings() {
  const { organizationId } = useOrganizationRouting();
  return useGetPublicSettings(organizationId ?? "", {
    query: {
      ...cachePolicy.long,
      enabled: !!organizationId,
    },
  });
}
