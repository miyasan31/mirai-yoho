import { MobileNavMenu } from "@mirai-yoho/ui/components/mobile-nav-menu";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  LogIn,
  LogOut,
  Plug,
  ScrollText,
  Store,
  Ticket,
  User,
} from "lucide-react";
import { useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/mypage")({
  component: MypageLayout,
});

const NAV_ITEMS = [
  { to: "/mypage", label: "ホーム", icon: CalendarDays, exact: true },
  {
    to: "/mypage/organizations",
    label: "店舗一覧",
    icon: Store,
    exact: false,
  },
  { to: "/mypage/profile", label: "プロフィール", icon: User, exact: false },
  {
    to: "/mypage/bookings",
    label: "予約一覧",
    icon: CalendarCheck,
    exact: false,
  },
  {
    to: "/mypage/appraisal-reports",
    label: "鑑定書",
    icon: ScrollText,
    exact: false,
  },
  { to: "/mypage/zoom", label: "外部連携", icon: Plug, exact: false },
  { to: "/mypage/coupons", label: "クーポン", icon: Ticket, exact: false },
] as const;

function MypageLayout() {
  const { user, isLoading, signInWithGoogle, signOut } = useCustomerAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return (
      <styled.div
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="50vh"
      >
        <Spinner />
      </styled.div>
    );
  }

  if (!user) {
    const startGoogle = () => {
      startTransition(async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          toaster.create({
            type: "error",
            title:
              error instanceof Error ? error.message : "ログインに失敗しました",
          });
        }
      });
    };

    return (
      <styled.div
        maxW="lg"
        mx="auto"
        p="6"
        display="flex"
        flexDir="column"
        gap="4"
      >
        <styled.div display="flex" alignItems="center" gap="2">
          <LogIn size={20} />
          <Text as="h1" textStyle="xl" fontWeight="bold">
            マイページのご利用にはログインが必要です
          </Text>
        </styled.div>
        <Button onClick={startGoogle} loading={isPending}>
          Google アカウントでログイン
        </Button>
      </styled.div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const navMenuItems = NAV_ITEMS.map((item) => ({
    key: item.to,
    label: item.label,
    icon: item.icon,
    active: item.exact ? pathname === item.to : pathname.startsWith(item.to),
    onSelect: () => navigate({ to: item.to }),
  }));

  return (
    <styled.div
      maxW="1024px"
      mx="auto"
      px={{ base: "4", md: "6" }}
      py="6"
      display="grid"
      gridTemplateColumns={{ base: "1fr", md: "220px 1fr" }}
      gap="6"
    >
      <styled.aside display={{ base: "none", md: "block" }}>
        <styled.nav display="flex" flexDir="column" gap="1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <styled.div
                  display="flex"
                  alignItems="center"
                  gap="2"
                  px="3"
                  py="2"
                  rounded="l2"
                  bg={isActive ? "bg.muted" : "transparent"}
                  color={isActive ? "fg.default" : "fg.muted"}
                  _hover={{ bg: "bg.muted" }}
                  whiteSpace="nowrap"
                >
                  <Icon size={18} />
                  <Text textStyle="sm">{item.label}</Text>
                </styled.div>
              </Link>
            );
          })}
        </styled.nav>
        <styled.div mt="4">
          <Button
            variant="plain"
            size="sm"
            colorPalette="red"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            ログアウト
          </Button>
        </styled.div>
      </styled.aside>
      <styled.main minW="0">
        <MobileNavMenu
          title="マイページ"
          items={navMenuItems}
          footerItems={[
            {
              key: "signout",
              label: "ログアウト",
              icon: LogOut,
              danger: true,
              onSelect: handleSignOut,
            },
          ]}
        />
        <Outlet />
      </styled.main>
    </styled.div>
  );
}
