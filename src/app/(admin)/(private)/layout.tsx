"use client";

import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import type { NavItem } from "@/components/sidebar-layout";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS: NavItem[] = [
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

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (role !== "super_admin" && role !== "operator"))
    ) {
      router.push("/admin/login");
    }
  }, [user, role, isLoading, router]);

  const visibleItems = useMemo(
    () =>
      role === "super_admin"
        ? NAV_ITEMS
        : NAV_ITEMS.filter((item) => item.href !== "/admin/users"),
    [role],
  );

  if (isLoading) {
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (!user || (role !== "super_admin" && role !== "operator")) {
    return null;
  }

  return (
    <SidebarLayout
      title="管理メニュー"
      navItems={visibleItems}
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
