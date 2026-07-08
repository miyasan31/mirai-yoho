import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, Video } from "lucide-react";
import { type ReactNode, useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface BookingAuthGateProps {
  children: ReactNode;
}

export function BookingAuthGate({ children }: BookingAuthGateProps) {
  const {
    user,
    isSignedUp,
    hasActiveZoomConnection,
    isLoading,
    signInAnonymously,
    signInWithGoogle,
  } = useCustomerAuth();
  const returnPath = useRouterState({
    select: (state) => state.location.href,
  });
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return (
      <styled.div
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="40vh"
      >
        <Spinner />
      </styled.div>
    );
  }

  if (!user) {
    const startGuest = () => {
      startTransition(async () => {
        try {
          await signInAnonymously();
        } catch (error) {
          toaster.create({
            type: "error",
            title:
              error instanceof Error
                ? error.message
                : "ゲスト予約の開始に失敗しました",
          });
        }
      });
    };

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
            予約に進むにはログインが必要です
          </Text>
        </styled.div>
        <Text textStyle="sm" color="fg.muted">
          メールアドレスのみで予約できる「ゲスト予約」、もしくは Google
          アカウントでのログインを選択してください。
        </Text>
        <styled.div display="flex" flexDir="column" gap="2">
          <Button onClick={startGuest} loading={isPending}>
            ゲストとして予約に進む
          </Button>
          <Button variant="outline" onClick={startGoogle} disabled={isPending}>
            Google アカウントでログイン
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  if (!isSignedUp) {
    return (
      <styled.div
        maxW="lg"
        mx="auto"
        p="6"
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Text as="h1" textStyle="xl" fontWeight="bold">
          会員情報の登録が必要です
        </Text>
        <Text textStyle="sm" color="fg.muted">
          お名前と生年月日をご登録ください。
        </Text>
        <Button asChild>
          <Link to="/mypage/profile" search={{ returnTo: returnPath }}>
            会員情報を登録する
          </Link>
        </Button>
      </styled.div>
    );
  }

  if (!hasActiveZoomConnection) {
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
          <Video size={20} />
          <Text as="h1" textStyle="xl" fontWeight="bold">
            Zoom 連携が必要です
          </Text>
        </styled.div>
        <Text textStyle="sm" color="fg.muted">
          ご予約には Zoom アカウントの連携が必要です。
        </Text>
        <Button asChild>
          <Link to="/mypage/zoom" search={{ returnTo: returnPath }}>
            Zoom を連携する
          </Link>
        </Button>
      </styled.div>
    );
  }

  return <>{children}</>;
}
