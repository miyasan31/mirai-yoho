"use client";

import {
  CalendarDays,
  CreditCard,
  House,
  LayoutDashboard,
  Settings,
  UserLock,
  UserRoundSearch,
  UserStar,
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
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

const NAV_ITEMS: Array<Omit<NavItem, "href"> & { path: string }> = [
  { path: "/admin/home", label: "ホーム", icon: House },
  {
    path: "/admin/dashboard",
    label: "ダッシュボード（集計）",
    icon: LayoutDashboard,
  },
  { path: "/admin/bookings", label: "予約管理", icon: CalendarDays },
  { path: "/admin/payments", label: "決済管理", icon: CreditCard },
  { path: "/admin/clients", label: "クライアント管理", icon: UserStar },
  { path: "/admin/consultants", label: "相談員管理", icon: UserRoundSearch },
  { path: "/admin/users", label: "ユーザー管理", icon: UserLock },
  { path: "/admin/settings", label: "設定", icon: Settings },
];

export default function AdminLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const {
    user,
    role,
    memberships,
    currentOrganizationId,
    currentDisplayName,
    isLoading,
    signOut,
    setCurrentOrganizationId,
  } = useAuth();
  const router = useRouter();
  const { organizationId, buildPath, replaceOrganization } =
    useOrganizationRouting();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    if (!organizationId) {
      if (currentOrganizationId) {
        router.replace(`/${currentOrganizationId}/admin/home`);
        return;
      }
      router.replace("/404");
      return;
    }

    if (role !== "admin" && role !== "operator") {
      router.replace("/404");
    }
  }, [currentOrganizationId, isLoading, organizationId, role, router, user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      router.replace("/admin/login");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [router]);

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        href: buildPath(item.path),
        label: item.label,
        icon: item.icon,
      })),
    [buildPath],
  );

  if (isLoading) {
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (!user || !organizationId || (role !== "admin" && role !== "operator")) {
    return null;
  }

  return (
    <SidebarLayout
      title="管理メニュー"
      navItems={visibleItems}
      organizationSwitcher={{
        items: memberships.map((membership) => ({
          label: membership.organizationName,
          value: membership.organizationId,
        })),
        value: currentOrganizationId,
        onChange: async (nextOrganizationId) => {
          await setCurrentOrganizationId(nextOrganizationId);
          replaceOrganization(nextOrganizationId);
        },
      }}
      currentDisplayName={currentDisplayName ?? user.email ?? "-"}
      onSignOut={signOut}
    >
      {children}
      {modal}
    </SidebarLayout>
  );
}
