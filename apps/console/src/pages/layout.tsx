import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@mirai-yoho/console-core/lib/api-client";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { CONSOLE_NAV_PERMISSIONS, NAV_ITEMS } from "./nav-items";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
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
      void navigate({ to: "/login", replace: true });
      return;
    }

    if (!organizationId) {
      if (currentOrganizationId) {
        void navigate({
          to: "/$organizationId/home",
          params: { organizationId: currentOrganizationId },
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
    currentOrganizationId,
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
