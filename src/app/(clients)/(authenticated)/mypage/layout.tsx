"use client";

import { CalendarDays, LogOut, Ticket, User, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

const NAV_ITEMS = [
  { href: "/mypage", label: "ホーム", icon: CalendarDays, exact: true },
  { href: "/mypage/profile", label: "プロフィール", icon: User },
  { href: "/mypage/zoom", label: "Zoom 連携", icon: Video },
  { href: "/mypage/coupons", label: "クーポン", icon: Ticket },
];

export default function MypageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useCustomerAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <styled.div
      maxW="1024px"
      mx="auto"
      px={{ base: "4", md: "6" }}
      py="6"
      display="grid"
      gridTemplateColumns={{ base: "1fr", md: "220px 1fr" }}
      gap="6"
    >
      <styled.aside>
        <styled.nav
          display="flex"
          flexDir={{ base: "row", md: "column" }}
          gap="1"
          overflowX={{ base: "auto", md: "visible" }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <styled.div
                  display="flex"
                  alignItems="center"
                  gap="2"
                  px="3"
                  py="2"
                  rounded="l2"
                  bg={isActive ? "bg.muted" : "transparent"}
                  color={isActive ? "fg.default" : "fg.muted"}
                  _hover={{ bg: "bg.muted" }}
                  whiteSpace="nowrap"
                >
                  <Icon size={18} />
                  <Text textStyle="sm">{item.label}</Text>
                </styled.div>
              </Link>
            );
          })}
        </styled.nav>
        <styled.div mt="4" display={{ base: "none", md: "block" }}>
          <Button variant="plain" size="sm" onClick={handleSignOut}>
            <LogOut size={16} />
            ログアウト
          </Button>
        </styled.div>
      </styled.aside>
      <styled.main>{children}</styled.main>
    </styled.div>
  );
}
