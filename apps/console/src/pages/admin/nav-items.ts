import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
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
import type { NavItem } from "@/components/sidebar-layout";

export const NAV_ITEMS: Array<
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

export const ADMIN_NAV_PERMISSIONS: AuthorizationPermission[] =
  NAV_ITEMS.flatMap((item) => item.permissions);
