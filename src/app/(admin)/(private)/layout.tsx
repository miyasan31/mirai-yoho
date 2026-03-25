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

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (role !== "super_admin" && role !== "operator"))
    ) {
      router.push("/admin/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!user || (role !== "super_admin" && role !== "operator")) {
    return null;
  }

  return (
    <styled.div display="flex" minH="100vh">
      <styled.aside
        w="240px"
        p="4"
        borderRight="1px solid"
        borderColor="border"
        bg="bg.subtle"
      >
        <Text as="h2" textStyle="lg" fontWeight="bold" mb="4">
          管理メニュー
        </Text>
        <styled.nav display="flex" flexDir="column" gap="2">
          <Link href="/admin/dashboard">ダッシュボード</Link>
          <Link href="/admin/bookings">予約管理</Link>
          <Link href="/admin/consultants">相談員管理</Link>
          <Link href="/admin/payments">決済管理</Link>
          <Link href="/admin/clients">クライアント管理</Link>
          {role === "super_admin" && (
            <Link href="/admin/users">ユーザー管理</Link>
          )}
          <Link href="/admin/settings">設定</Link>
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
