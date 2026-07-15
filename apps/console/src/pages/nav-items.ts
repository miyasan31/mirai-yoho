import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import {
  CalendarDays,
  CreditCard,
  House,
  LayoutDashboard,
  Settings,
  TicketPercent,
  UserLock,
  UserRoundSearch,
  UserStar,
} from "lucide-react";
import type { NavItem } from "@/components/sidebar-layout";

export const NAV_ITEMS: Array<
  Omit<NavItem, "href"> & {
    path: string;
    permissions: AuthorizationPermission[];
  }
> = [
  {
    path: "/home",
    label: "ホーム",
    icon: House,
    permissions: ["console.dashboard.read"],
  },
  {
    path: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    permissions: ["console.dashboard.read"],
  },
  {
    path: "/bookings",
    label: "予約管理",
    icon: CalendarDays,
    permissions: ["console.bookings.read"],
  },
  {
    path: "/payments",
    label: "決済管理",
    icon: CreditCard,
    permissions: ["console.payments.read"],
  },
  {
    path: "/customers",
    label: "顧客管理",
    icon: UserStar,
    permissions: ["console.customers.read"],
  },
  {
    path: "/consultants",
    label: "相談員管理",
    icon: UserRoundSearch,
    permissions: ["console.consultants.read"],
  },
  {
    path: "/accounts",
    label: "アカウント管理",
    icon: UserLock,
    permissions: ["console.accounts.read"],
  },
  {
    path: "/coupons",
    label: "クーポン管理",
    icon: TicketPercent,
    permissions: ["console.coupons.read"],
  },
  {
    path: "/settings",
    label: "設定",
    icon: Settings,
    permissions: ["console.settings.read"],
  },
];

export const CONSOLE_NAV_PERMISSIONS: AuthorizationPermission[] =
  NAV_ITEMS.flatMap((item) => item.permissions);
