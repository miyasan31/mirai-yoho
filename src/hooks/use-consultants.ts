import { useGetConsultants as useGeneratedGetConsultants } from "@/generated/api/consultant/consultant";

export function useGetConsultants(enabled = true) {
  return useGeneratedGetConsultants({ query: { enabled } });
}
