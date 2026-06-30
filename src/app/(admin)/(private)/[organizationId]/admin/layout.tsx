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
import type { AuthorizationPermission } from "@/domain/authorization/authorization-permission";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

const NAV_ITEMS: Array<
  Omit<NavItem, "href"> & {
    path: string;
    permissions: AuthorizationPermission[];
  }
> = [
  {
    path: "/admin/home",
    label: "ホーム",
    icon: House,
    permissions: ["admin.dashboard.read"],
  },
  {
    path: "/admin/dashboard",
    label: "ダッシュボード（集計）",
    icon: LayoutDashboard,
    permissions: ["admin.dashboard.read"],
  },
  {
    path: "/admin/bookings",
    label: "予約管理",
    icon: CalendarDays,
    permissions: ["admin.bookings.read"],
  },
  {
    path: "/admin/payments",
    label: "決済管理",
    icon: CreditCard,
    permissions: ["admin.payments.read"],
  },
  {
    path: "/admin/customers",
    label: "顧客管理",
    icon: UserStar,
    permissions: ["admin.customers.read"],
  },
  {
    path: "/admin/consultants",
    label: "相談員管理",
    icon: UserRoundSearch,
    permissions: ["admin.consultants.read"],
  },
  {
    path: "/admin/accounts",
    label: "アカウント管理",
    icon: UserLock,
    permissions: ["admin.accounts.read"],
  },
  {
    path: "/admin/settings",
    label: "設定",
    icon: Settings,
    permissions: ["admin.settings.read"],
  },
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
    hasAnyPermission,
    accounts,
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

    if (!hasAnyPermission(NAV_ITEMS.flatMap((item) => item.permissions))) {
      router.replace("/404");
    }
  }, [
    currentOrganizationId,
    hasAnyPermission,
    isLoading,
    organizationId,
    router,
    user,
  ]);

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
        ...item,
        href: buildPath(item.path),
      })).filter((item) => hasAnyPermission(item.permissions)),
    [buildPath, hasAnyPermission],
  );

  if (isLoading) {
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (
    !user ||
    !organizationId ||
    !hasAnyPermission(NAV_ITEMS.flatMap((item) => item.permissions))
  ) {
    return null;
  }

  return (
    <SidebarLayout
      title="管理メニュー"
      navItems={visibleItems}
      organizationSwitcher={{
        items: accounts.map((account) => ({
          label: account.name,
          value: account.organizationId,
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
