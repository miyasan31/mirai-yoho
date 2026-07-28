import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { UNAUTHORIZED_EVENT_NAME } from "@mirai-yoho/console-core/lib/api-client";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  FileText,
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

const NAV_ITEMS: Array<Omit<NavItem, "href"> & { path: string }> = [
  { path: "/home", label: "ホーム", icon: House },
  { path: "/bookings", label: "予約一覧", icon: CalendarDays },
  { path: "/slots", label: "スケジュール管理", icon: Clock },
  { path: "/price-plans", label: "料金プラン", icon: ReceiptText },
  { path: "/documents", label: "文書管理", icon: FileText },
  { path: "/profile", label: "プロフィール", icon: UserCircle },
];

export default function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    isConsultant,
    consultants,
    defaultOrganizationId,
    currentDisplayName,
    isLoading,
    signOut,
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

    if (!isConsultant) {
      void navigate({ href: "/404", replace: true });
    }
  }, [
    defaultOrganizationId,
    isConsultant,
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

  if (isLoading) {
    return <SidebarLayoutSkeleton navItemCount={NAV_ITEMS.length} />;
  }

  if (!user || !organizationId || !isConsultant) {
    return null;
  }

  return (
    <SidebarLayout
      title="占い師メニュー"
      navItems={NAV_ITEMS.map((item) => ({
        href: buildPath(item.path),
        label: item.label,
        icon: item.icon,
      }))}
      organizationSwitcher={{
        items: consultants.map((consultant) => ({
          label: consultant.name,
          value: consultant.organizationId,
        })),
        value: organizationId,
        onChange: replaceOrganization,
      }}
      currentDisplayName={sidebarDisplayName}
      onSignOut={signOut}
    >
      {children}
    </SidebarLayout>
  );
}
