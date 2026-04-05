import {
  useGetAdminBookingSettings,
  useUpdateAdminBookingSettings,
} from "@/generated/api/admin/admin";
import { useGetPublicSettings } from "@/generated/api/settings/settings";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export function usePublicBookingSettings() {
  const { organizationId } = useOrganizationRouting();
  return useGetPublicSettings(organizationId ?? "", {
    query: { enabled: !!organizationId },
  });
}

export function useAdminBookingSettings() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetAdminBookingSettings(organizationId ?? "", {
    query: { enabled: !!token && !!organizationId },
  });
}

export { useUpdateAdminBookingSettings };
