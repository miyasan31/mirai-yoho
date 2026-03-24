import { useGetAdminPayments } from "@/generated/api/admin/admin";
import { useAuth } from "@/hooks/use-auth";

export function useAdminPayments() {
  const { token } = useAuth();
  return useGetAdminPayments({ query: { enabled: !!token } });
}
