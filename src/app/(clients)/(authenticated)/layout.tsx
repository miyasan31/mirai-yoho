"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { styled } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export default function AuthenticatedClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <styled.div
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="50vh"
      >
        <Spinner />
      </styled.div>
    );
  }

  return <>{children}</>;
}
