"use client";

import { CheckCircle, CircleX, ShieldX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import type { CancelBookingBody } from "@/generated/schemas";
import { useCancelBooking } from "@/hooks/use-booking";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function CancelPage() {
  const searchParams = useSearchParams();
  const { organizationId } = useOrganizationRouting();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  const cancelBooking = useCancelBooking();

  if (!token) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={ShieldX}
          message="無効なキャンセルリンクです"
          hint="メールに記載されたリンクをご確認ください"
        />
      </styled.div>
    );
  }

  const bookingId = token.split(".")[0];

  const handleCancel = async () => {
    setStatus("loading");
    try {
      await cancelBooking.mutateAsync({
        organizationId: organizationId ?? "",
        bookingId,
        // token は OpenAPI スキーマに未定義だが API 側で必要
        data: { cancelledBy: "customer", token } as CancelBookingBody,
      });
      setStatus("success");
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "キャンセルに失敗しました",
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <styled.div maxW="lg" mx="auto" p="8" textAlign="center">
        <CheckCircle
          size={48}
          color="var(--colors-green-500)"
          style={{ margin: "0 auto 16px" }}
        />
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
          キャンセル完了
        </Text>
        <Text color="fg.muted">
          ご予約のキャンセルが完了しました。確認メールをお送りしました。
        </Text>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="lg" mx="auto" p="8" textAlign="center">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        予約キャンセル
      </Text>
      <Text color="fg.muted" mb="8">
        予約をキャンセルしますか？この操作は取り消せません。
      </Text>

      {errorMessage && (
        <styled.div
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="2"
          p="3"
          mb="4"
          bg="red.50"
          rounded="l2"
        >
          <CircleX
            size={16}
            color="var(--colors-red-500)"
            style={{ flexShrink: 0 }}
          />
          <Text textStyle="sm" color="red.700">
            {errorMessage}
          </Text>
        </styled.div>
      )}

      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button colorPalette="red">予約をキャンセルする</Button>
        </Dialog.Trigger>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>予約をキャンセルしますか？</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">
                この操作は取り消せません。キャンセル確認メールが送信されます。
              </Text>
            </Dialog.Body>
            <Dialog.Footer display="flex" justifyContent="flex-end" gap="3">
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">戻る</Button>
              </Dialog.CloseTrigger>
              <Dialog.ActionTrigger asChild>
                <Button
                  colorPalette="red"
                  onClick={handleCancel}
                  loading={status === "loading"}
                  loadingText="キャンセル中..."
                >
                  キャンセルする
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </styled.div>
  );
}
