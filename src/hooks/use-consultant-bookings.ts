import {
  useGetConsultantBookings,
  useUpdateConsultantMemo,
} from "@/generated/api/consultant/consultant";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantBookings() {
  const { token } = useAuth();
  return useGetConsultantBookings({ query: { enabled: !!token } });
}

export { useUpdateConsultantMemo };
