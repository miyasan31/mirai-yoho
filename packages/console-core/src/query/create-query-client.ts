import { QueryClient } from "@tanstack/react-query";
import { cachePolicy } from "./cache-policy";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: cachePolicy.short.staleTime,
        gcTime: cachePolicy.short.gcTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        retry: (failureCount, error) => {
          const status =
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof error.status === "number"
              ? error.status
              : 0;
          return failureCount < 1 && status >= 500;
        },
      },
    },
  });
}
