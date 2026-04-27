"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toast";
import { AuthContext, useAuthState } from "@/hooks/use-auth";
import { setAuthToken } from "@/lib/auth-token";

type ProvidersProps = {
  children: ReactNode;
};

function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();

  useEffect(() => {
    setAuthToken(authState.token);
  }, [authState.token]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
