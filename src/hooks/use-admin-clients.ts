import { useGetAdminClients } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";

export function useAdminClients() {
  const { token } = useAuth();
  return useGetAdminClients({ query: { enabled: !!token } });
}
