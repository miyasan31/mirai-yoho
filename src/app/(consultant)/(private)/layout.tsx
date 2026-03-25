"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

export default function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, role, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || role !== "consultant")) {
      router.push("/consultant/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!user || role !== "consultant") {
    return null;
  }

  return (
    <styled.div display="flex" minH="100vh">
      <styled.aside
        w="240px"
        p="4"
        borderRight="1px solid"
        borderColor="border"
      >
        <Text as="h2" textStyle="lg" fontWeight="bold" mb="4">
          相談員メニュー
        </Text>
        <styled.nav display="flex" flexDir="column" gap="2">
          <Link href="/consultant/bookings">予約一覧</Link>
          <Link href="/consultant/slots">スケジュール管理</Link>
          <Link href="/consultant/profile">プロフィール</Link>
        </styled.nav>
        <Button variant="outline" mt="8" onClick={() => signOut()}>
          ログアウト
        </Button>
      </styled.aside>
      <styled.main flex="1" p="6">
        {children}
      </styled.main>
    </styled.div>
  );
}
