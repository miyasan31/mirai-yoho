import {
  useGetAdminBookingSettings,
  useUpdateAdminBookingSettings,
} from "@/generated/api/admin/admin";
import { useGetPublicSettings } from "@/generated/api/settings/settings";
import { useAuth } from "@/hooks/use-auth";

export function usePublicBookingSettings() {
  return useGetPublicSettings();
}

export function useAdminBookingSettings() {
  const { token } = useAuth();
  return useGetAdminBookingSettings({ query: { enabled: !!token } });
}

export { useUpdateAdminBookingSettings };
