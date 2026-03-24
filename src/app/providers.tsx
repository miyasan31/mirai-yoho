"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { useState } from "react";
import { AuthContext, useAuthState } from "@/hooks/use-auth";

type ProvidersProps = {
  children: ReactNode;
};

function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
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
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <AuthProvider>{children}</AuthProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
