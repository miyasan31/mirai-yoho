import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@mirai-yoho/console-core/lib/api-client";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";
import { canOpenConsole } from "@/lib/organization-access";
import { CONSOLE_NAV_PERMISSIONS, NAV_ITEMS } from "./nav-items";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const {
    user,
    hasAnyPermission,
    accounts,
    defaultOrganizationId,
    currentDisplayName,
    isLoading,
    signOut,
  } = useAuth();
  const navigate = useNavigate();
  const { organizationId, buildPath, replaceOrganization } =
    useOrganizationRouting();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      void navigate({ to: "/login", replace: true });
      return;
    }

    if (!organizationId) {
      if (defaultOrganizationId) {
        void navigate({
          to: "/$organizationId/home",
          params: { organizationId: defaultOrganizationId },
          replace: true,
        });
        return;
      }
      void navigate({ href: "/404", replace: true });
      return;
    }

    if (!hasAnyPermission(CONSOLE_NAV_PERMISSIONS)) {
      void navigate({ href: "/404", replace: true });
    }
  }, [
    defaultOrganizationId,
    hasAnyPermission,
    isLoading,
    navigate,
    organizationId,
    user,
  ]);

  useEffect(() => {
    const handleUnauthorized = () => {
      void navigate({ to: "/login", replace: true });
    };

    window.addEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    };
  }, [navigate]);

  // コンソールを開けない組織に切り替えると 404 に落ちるため、一覧から除く
  const switchableAccounts = useMemo(
    () => accounts.filter(canOpenConsole),
    [accounts],
  );

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

  if (!user || !organizationId || !hasAnyPermission(CONSOLE_NAV_PERMISSIONS)) {
    return null;
  }

  return (
    <SidebarLayout
      title="管理メニュー"
      navItems={visibleItems}
      organizationSwitcher={{
        items: switchableAccounts.map((account) => ({
          label: account.name,
          value: account.organizationId,
        })),
        value: organizationId,
        onChange: replaceOrganization,
      }}
      currentDisplayName={currentDisplayName ?? user.email ?? "-"}
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
