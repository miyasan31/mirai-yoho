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
    isLoading,
    signOut,
    setCurrentOrganizationId,
  } = useAuth();
  const router = useRouter();
  const { organizationId, buildPath, replaceOrganization } =
    useOrganizationRouting();

  useEffect(() => {
    if (!isLoading && (!user || !organizationId || role !== "consultant")) {
      router.push("/consultant/login");
    }
  }, [user, role, isLoading, router, organizationId]);

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
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
