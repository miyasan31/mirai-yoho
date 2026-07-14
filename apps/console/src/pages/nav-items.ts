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
    path: "/home",
    label: "ホーム",
    icon: House,
    permissions: ["admin.dashboard.read"],
  },
  {
    path: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    permissions: ["admin.dashboard.read"],
  },
  {
    path: "/bookings",
    label: "予約管理",
    icon: CalendarDays,
    permissions: ["admin.bookings.read"],
  },
  {
    path: "/payments",
    label: "決済管理",
    icon: CreditCard,
    permissions: ["admin.payments.read"],
  },
  {
    path: "/customers",
    label: "顧客管理",
    icon: UserStar,
    permissions: ["admin.customers.read"],
  },
  {
    path: "/consultants",
    label: "相談員管理",
    icon: UserRoundSearch,
    permissions: ["admin.consultants.read"],
  },
  {
    path: "/accounts",
    label: "アカウント管理",
    icon: UserLock,
    permissions: ["admin.accounts.read"],
  },
  {
    path: "/settings",
    label: "設定",
    icon: Settings,
    permissions: ["admin.settings.read"],
  },
];

export const ADMIN_NAV_PERMISSIONS: AuthorizationPermission[] =
  NAV_ITEMS.flatMap((item) => item.permissions);
