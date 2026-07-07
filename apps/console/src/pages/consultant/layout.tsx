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
import { useAuth } from "@/hooks/use-auth";
import { useConsultantProfile } from "@/hooks/use-consultant-profile";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@/lib/api-client";

const NAV_ITEMS: Array<Omit<NavItem, "href"> & { path: string }> = [
  { path: "/consultant/home", label: "ホーム", icon: House },
  { path: "/consultant/bookings", label: "予約一覧", icon: CalendarDays },
  { path: "/consultant/slots", label: "スケジュール管理", icon: Clock },
  { path: "/consultant/price-plans", label: "料金プラン", icon: ReceiptText },
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
      void navigate({ to: "/consultant/login", replace: true });
      return;
    }

    if (!organizationId) {
      if (currentOrganizationId) {
        void navigate({
          to: "/$organizationId/consultant/home",
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
      void navigate({ to: "/consultant/login", replace: true });
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
