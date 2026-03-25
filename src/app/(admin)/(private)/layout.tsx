"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "予約管理", icon: CalendarDays },
  { href: "/admin/consultants", label: "相談員管理", icon: Users },
  { href: "/admin/payments", label: "決済管理", icon: CreditCard },
  { href: "/admin/clients", label: "クライアント管理", icon: Building2 },
  { href: "/admin/users", label: "ユーザー管理", icon: UserCog },
  { href: "/admin/settings", label: "設定", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (role !== "super_admin" && role !== "operator"))
    ) {
      router.push("/admin/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return (
      <styled.div display="flex" minH="100vh">
        <styled.aside
          w="240px"
          p="4"
          bg="bg.subtle"
          borderRight="1px solid"
          borderColor="border"
        >
          <Skeleton height="6" width="140px" mb="6" />
          <styled.div display="flex" flexDir="column" gap="1">
            {NAV_ITEMS.map((item) => (
              <Skeleton key={item.href} height="9" rounded="l2" />
            ))}
          </styled.div>
        </styled.aside>
        <styled.main flex="1" p="6">
          <Skeleton height="8" width="200px" mb="6" />
          <Skeleton height="300px" rounded="l2" />
        </styled.main>
      </styled.div>
    );
  }

  if (!user || (role !== "super_admin" && role !== "operator")) {
    return null;
  }

  const visibleItems =
    role === "super_admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => item.href !== "/admin/users");

  return (
    <styled.div display="flex" minH="100vh">
      <styled.aside
        w="240px"
        p="4"
        borderRight="1px solid"
        borderColor="border"
        bg="bg.subtle"
        display="flex"
        flexDir="column"
      >
        <Text as="h2" textStyle="lg" fontWeight="bold" mb="6">
          管理メニュー
        </Text>
        <styled.nav display="flex" flexDir="column" gap="1">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <styled.span key={item.href}>
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <styled.span
                    display="flex"
                    alignItems="center"
                    gap="2"
                    px="3"
                    py="2"
                    rounded="l2"
                    textStyle="sm"
                    transition="all"
                    transitionDuration="normal"
                    cursor="pointer"
                    bg={isActive ? "colorPalette.subtle" : undefined}
                    fontWeight={isActive ? "bold" : "normal"}
                    color={isActive ? "colorPalette.default" : "fg.muted"}
                    _hover={{ bg: "colorPalette.subtle" }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </styled.span>
                </Link>
              </styled.span>
            );
          })}
        </styled.nav>
        <styled.div mt="auto">
          <Button variant="outline" w="full" onClick={() => signOut()}>
            <LogOut size={16} />
            ログアウト
          </Button>
        </styled.div>
      </styled.aside>
      <styled.main flex="1" p="6">
        {children}
      </styled.main>
    </styled.div>
  );
}
