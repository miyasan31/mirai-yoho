import {
  useGetAdminBookingSettings,
  useGetAdminConsultantRanks,
  useUpdateAdminBookingSettings,
  useUpdateAdminConsultantRanks,
} from "@/generated/api/admin/admin";
import { useGetPublicSettings } from "@/generated/api/settings/settings";
import { QUERY_STALE_TIME } from "@/hooks/query-cache-policy";
import { useAuth } from "@/hooks/use-auth";
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

export function useAdminConsultantRanks() {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminConsultantRanks(organizationId ?? "", {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("admin.settings.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export { useUpdateAdminBookingSettings, useUpdateAdminConsultantRanks };
