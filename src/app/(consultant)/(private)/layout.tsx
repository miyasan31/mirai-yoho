"use client";

import { CalendarDays, Clock, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import type { NavItem } from "@/components/sidebar-layout";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS: NavItem[] = [
  { href: "/consultant/bookings", label: "予約一覧", icon: CalendarDays },
  { href: "/consultant/slots", label: "スケジュール管理", icon: Clock },
  { href: "/consultant/profile", label: "プロフィール", icon: UserCircle },
];

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
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (!user || role !== "consultant") {
    return null;
  }

  return (
    <SidebarLayout
      title="相談員メニュー"
      navItems={NAV_ITEMS}
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
