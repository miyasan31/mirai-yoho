import {
  createZoomAuthorizeUrl,
  revokeZoomConnection,
} from "@mirai-yoho/api-client/api/customer/customer";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface ZoomSearch {
  status?: string;
  reason?: string;
  returnTo?: string;
}

export const Route = createFileRoute("/mypage/zoom")({
  validateSearch: (search: Record<string, unknown>): ZoomSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    reason: typeof search.reason === "string" ? search.reason : undefined,
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: ZoomLinkPage,
});

const STATUS_MESSAGES: Record<string, { color: string; text: string }> = {
  connected: { color: "fg.success", text: "Zoom 連携が完了しました。" },
  error: { color: "fg.error", text: "Zoom 連携に失敗しました。" },
};

function ZoomLinkPage() {
  const { profile, hasActiveZoomConnection, refreshProfile } =
    useCustomerAuth();
  const { status: callbackStatus, reason: callbackReason } = Route.useSearch();
  const [isPending, startTransition] = useTransition();

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

  const callback = callbackStatus ? STATUS_MESSAGES[callbackStatus] : undefined;

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        Zoom 連携
      </Text>
      <Text color="fg.muted" textStyle="sm">
        ご予約には Zoom アカウントの連携が必要です。
      </Text>

      {callback && (
        <Text color={callback.color}>
          {callback.text}
          {callbackReason && (
            <styled.span color="fg.muted">（{callbackReason}）</styled.span>
          )}
        </Text>
      )}

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
    </styled.div>
  );
}
