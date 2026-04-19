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
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

const NAV_ITEMS: Array<Omit<NavItem, "href"> & { path: string }> = [
  { path: "/consultant/bookings", label: "予約一覧", icon: CalendarDays },
  { path: "/consultant/slots", label: "スケジュール管理", icon: Clock },
  { path: "/consultant/profile", label: "プロフィール", icon: UserCircle },
];

export default function ConsultantLayout({
  children,
}: {
  children: ReactNode;
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
      router.replace("/consultant/login");
      return;
    }

    if (!organizationId) {
      if (currentOrganizationId) {
        router.replace(`/${currentOrganizationId}/consultant/bookings`);
        return;
      }
      router.replace("/404");
      return;
    }

    if (role !== "consultant") {
      router.replace("/404");
    }
  }, [currentOrganizationId, isLoading, organizationId, role, router, user]);

  if (isLoading) {
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (!user || !organizationId || role !== "consultant") {
    return null;
  }

  return (
    <SidebarLayout
      title="相談員メニュー"
      navItems={NAV_ITEMS.map((item) => ({
        href: buildPath(item.path),
        label: item.label,
        icon: item.icon,
      }))}
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
    </SidebarLayout>
  );
}
