"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

const STATUS_MESSAGES: Record<string, { color: string; text: string }> = {
  connected: { color: "fg.success", text: "Zoom 連携が完了しました。" },
  error: { color: "fg.error", text: "Zoom 連携に失敗しました。" },
};

export default function ZoomLinkPage() {
  const { token, profile, hasActiveZoomConnection, refreshProfile } =
    useCustomerAuth();
  const searchParams = useSearchParams();
  const callbackStatus = searchParams.get("status") ?? "";
  const callbackReason = searchParams.get("reason") ?? "";
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const startConnect = async () => {
    setActionError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/zoom/authorize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "認可 URL の取得に失敗しました");
      }
      const { url } = (await response.json()) as { url: string };
      window.location.href = url;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "連携を開始できませんでした",
      );
      setIsLoading(false);
    }
  };

  const onDisconnect = async () => {
    setActionError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/zoom/revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "連携解除に失敗しました");
      }
      await refreshProfile();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "連携解除に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const callback = STATUS_MESSAGES[callbackStatus];

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
        {actionError && <Text color="fg.error">{actionError}</Text>}
        {hasActiveZoomConnection ? (
          <Button
            variant="outline"
            onClick={onDisconnect}
            loading={isLoading}
            loadingText="解除中..."
          >
            連携を解除する
          </Button>
        ) : (
          <Button onClick={startConnect} loading={isLoading}>
            Zoom を連携する
          </Button>
        )}
      </styled.div>
    </styled.div>
  );
}
