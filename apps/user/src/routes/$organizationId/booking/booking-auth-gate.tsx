"use client";

import { LogIn, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
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
  } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const returnPath = `${pathname}?${searchParams.toString()}`;
  const profileHref = `/mypage/profile?returnTo=${encodeURIComponent(returnPath)}`;
  const zoomHref = `/mypage/zoom?returnTo=${encodeURIComponent(returnPath)}`;

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
    const startGuest = async () => {
      setAuthError("");
      setBusy(true);
      try {
        await signInAnonymously();
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : "ゲスト予約の開始に失敗しました",
        );
      } finally {
        setBusy(false);
      }
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
        {authError && <Text color="fg.error">{authError}</Text>}
        <styled.div display="flex" flexDir="column" gap="2">
          <Button onClick={startGuest} loading={busy}>
            ゲストとして予約に進む
          </Button>
          <Button
            asChild
            variant="outline"
            onClick={() => {
              router.push(`/login?returnTo=${encodeURIComponent(returnPath)}`);
            }}
          >
            <span>Google アカウントでログイン</span>
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
          <Link href={profileHref}>会員情報を登録する</Link>
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
          <Link href={zoomHref}>Zoom を連携する</Link>
        </Button>
      </styled.div>
    );
  }

  return <>{children}</>;
}
