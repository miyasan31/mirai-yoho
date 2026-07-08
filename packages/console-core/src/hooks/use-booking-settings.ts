import {
  useGetAdminBookingSettings,
  useGetAdminConsultantStatuses,
  useUpdateAdminBookingSettings,
  useUpdateAdminConsultantStatuses,
} from "@mirai-yoho/api-client/api/admin/admin";
import { useGetPublicSettings } from "@mirai-yoho/api-client/api/settings/settings";
import { QUERY_STALE_TIME } from "./query-cache-policy";
import { useAuth } from "./use-auth";
import { useOrganizationRouting } from "./use-organization-routing";

export function usePublicBookingSettings() {
  const { organizationId } = useOrganizationRouting();
  return useGetPublicSettings(organizationId ?? "", {
    query: {
      enabled: !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useAdminBookingSettings() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminBookingSettings(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.settings.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export function useAdminConsultantStatuses() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminConsultantStatuses(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.settings.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export { useUpdateAdminBookingSettings, useUpdateAdminConsultantStatuses };
