import {
  useDeleteAdminConsultant,
  useGetAdminConsultants,
  useUpdateAdminConsultant,
} from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";

export function useAdminConsultants() {
  const { token } = useAuth();
  return useGetAdminConsultants({ query: { enabled: !!token } });
}

export { useUpdateAdminConsultant, useDeleteAdminConsultant };
