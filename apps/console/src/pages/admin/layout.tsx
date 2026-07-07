import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { useNavigate } from "@tanstack/react-router";
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
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import type { NavItem } from "@/components/sidebar-layout";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@/lib/api-client";

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

export default function AdminLayout({ children }: { children: ReactNode }) {
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
  const navigate = useNavigate();
  const { organizationId, buildPath, replaceOrganization } =
    useOrganizationRouting();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      void navigate({ to: "/admin/login", replace: true });
      return;
    }

    if (!organizationId) {
      if (currentOrganizationId) {
        void navigate({
          to: "/$organizationId/admin/home",
          params: { organizationId: currentOrganizationId },
          replace: true,
        });
        return;
      }
      void navigate({ href: "/404", replace: true });
      return;
    }

    if (!hasAnyPermission(NAV_ITEMS.flatMap((item) => item.permissions))) {
      void navigate({ href: "/404", replace: true });
    }
  }, [
    currentOrganizationId,
    hasAnyPermission,
    isLoading,
    navigate,
    organizationId,
    user,
  ]);

  useEffect(() => {
    const handleUnauthorized = () => {
      void navigate({ to: "/admin/login", replace: true });
    };

    window.addEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    };
  }, [navigate]);

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
    </SidebarLayout>
  );
}
