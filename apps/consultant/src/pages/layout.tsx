import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@mirai-yoho/console-core/lib/api-client";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  House,
  ReceiptText,
  UserCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import type { NavItem } from "@/components/sidebar-layout";
import {
  SidebarLayout,
  SidebarLayoutSkeleton,
} from "@/components/sidebar-layout";
import { useConsultantProfile } from "@/hooks/use-consultant-profile";

const NAV_ITEMS: Array<Omit<NavItem, "href"> & { path: string }> = [
  { path: "/home", label: "ホーム", icon: House },
  { path: "/bookings", label: "予約一覧", icon: CalendarDays },
  { path: "/slots", label: "スケジュール管理", icon: Clock },
  { path: "/price-plans", label: "料金プラン", icon: ReceiptText },
  { path: "/profile", label: "プロフィール", icon: UserCircle },
];

export default function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    role,
    accounts,
    currentOrganizationId,
    currentDisplayName,
    isLoading,
    signOut,
    setCurrentOrganizationId,
  } = useAuth();
  const { data: consultantProfileData } = useConsultantProfile();
  const navigate = useNavigate();
  const { organizationId, buildPath, replaceOrganization } =
    useOrganizationRouting();
  const consultantProfileDisplayName =
    consultantProfileData?.data.name?.trim() ?? "";
  const sidebarDisplayName =
    consultantProfileDisplayName || currentDisplayName || user?.email || "-";

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

    if (role !== "consultant") {
      void navigate({ href: "/404", replace: true });
    }
  }, [currentOrganizationId, isLoading, navigate, organizationId, role, user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      void navigate({ to: "/login", replace: true });
    };

    window.addEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    };
  }, [navigate]);

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
      currentDisplayName={sidebarDisplayName}
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
