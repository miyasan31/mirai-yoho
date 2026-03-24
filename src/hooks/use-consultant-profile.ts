import {
  useGetConsultantProfile,
  useUpdateConsultantProfile,
} from "@/generated/api/consultant/consultant";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantProfile() {
  const { token } = useAuth();
  return useGetConsultantProfile({ query: { enabled: !!token } });
}

export { useUpdateConsultantProfile };
