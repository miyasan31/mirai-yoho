import { Toaster } from "@mirai-yoho/ui/components/ui/toast";
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import NotFound from "@/components/not-found";
import { AuthContext, useAuthState } from "@/hooks/use-auth";

function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <HeadContent />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});
