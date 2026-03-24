import { useGetAdminDashboard } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";

export function useAdminDashboard() {
  const { token } = useAuth();
  return useGetAdminDashboard({ query: { enabled: !!token } });
}
