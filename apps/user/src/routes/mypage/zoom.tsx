import {
  createZoomAuthorizeUrl,
  revokeZoomConnection,
} from "@mirai-yoho/api-client/api/customer/customer";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { useEffect, useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { pageHead } from "@/lib/head";

interface ZoomSearch {
  status?: string;
  reason?: string;
  returnTo?: string;
}

export const Route = createFileRoute("/mypage/zoom")({
  head: () => pageHead("外部連携"),
  validateSearch: (search: Record<string, unknown>): ZoomSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    reason: typeof search.reason === "string" ? search.reason : undefined,
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: ExternalIntegrationPage,
});

function ExternalIntegrationPage() {
  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <styled.div display="flex" flexDir="column" gap="1">
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          外部連携
        </Text>
        <Text color="fg.muted" textStyle="sm">
          ご利用中の外部サービスとの連携を管理できます。
        </Text>
      </styled.div>

      <ZoomIntegrationSection />
    </styled.div>
  );
}

function ZoomIntegrationSection() {
  const { profile, hasActiveZoomConnection, refreshProfile } =
    useCustomerAuth();
  const { status: callbackStatus, reason: callbackReason } = Route.useSearch();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (callbackStatus === "connected") {
      toaster.create({ type: "success", title: "Zoom 連携が完了しました" });
    } else if (callbackStatus === "error") {
      toaster.create({
        type: "error",
        title: "Zoom 連携に失敗しました",
        description: callbackReason,
      });
    }
  }, [callbackStatus, callbackReason]);

  const startConnect = () => {
    startTransition(async () => {
      try {
        const response = await createZoomAuthorizeUrl();
        window.location.href = response.data.url;
      } catch {
        // エラーは custom-fetch の toaster で表示される
      }
    });
  };

  const onDisconnect = () => {
    startTransition(async () => {
      try {
        await revokeZoomConnection();
        await refreshProfile();
      } catch {
        // エラーは custom-fetch の toaster で表示される
      }
    });
  };

  return (
    <styled.section display="flex" flexDir="column" gap="3">
      <styled.div display="flex" flexDir="column" gap="1">
        <styled.div display="flex" alignItems="center" gap="2">
          <Video size={18} color="var(--colors-fg-muted)" />
          <Text as="h2" textStyle="lg" fontWeight="semibold">
            Zoom
          </Text>
        </styled.div>
        <Text color="fg.muted" textStyle="sm">
          ご予約には Zoom アカウントの連携が必要です。
        </Text>
      </styled.div>

      <styled.div
        border="1px solid"
        borderColor="border"
        rounded="l3"
        p="4"
        display="flex"
        flexDir="column"
        gap="3"
      >
        <styled.div display="flex" alignItems="center" gap="2">
          <styled.span
            display="inline-block"
            w="2"
            h="2"
            rounded="full"
            bg={hasActiveZoomConnection ? "fg.success" : "fg.muted"}
          />
          <Text fontWeight="medium">
            {hasActiveZoomConnection ? "連携済み" : "未連携"}
          </Text>
        </styled.div>
        {hasActiveZoomConnection && profile?.zoomEmail && (
          <Text textStyle="sm" color="fg.muted">
            Zoom Email: {profile.zoomEmail}
          </Text>
        )}
        {hasActiveZoomConnection ? (
          <Button
            variant="outline"
            onClick={onDisconnect}
            loading={isPending}
            loadingText="解除中..."
          >
            連携を解除する
          </Button>
        ) : (
          <Button onClick={startConnect} loading={isPending}>
            Zoom を連携する
          </Button>
        )}
      </styled.div>
    </styled.section>
  );
}
