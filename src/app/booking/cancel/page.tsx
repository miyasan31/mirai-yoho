"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { CancelBookingBody } from "@/generated/schemas";
import { useCancelBooking } from "@/hooks/use-booking";

export default function CancelPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>();

  const cancelBooking = useCancelBooking();

  if (!token) {
    return (
      <div className={css({ p: "8" })}>
        <Text className={css({ color: "red.500" })}>
          無効なキャンセルリンクです
        </Text>
      </div>
    );
  }

  const bookingId = token.split(".")[0];

  const handleCancel = async () => {
    setStatus("loading");
    try {
      await cancelBooking.mutateAsync({
        bookingId,
        // token は OpenAPI スキーマに未定義だが API 側で必要
        data: { cancelledBy: "client", token } as CancelBookingBody,
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
      <div
        className={css({ maxW: "lg", mx: "auto", p: "8", textAlign: "center" })}
      >
        <Text
          as="h1"
          className={css({ fontSize: "3xl", fontWeight: "bold", mb: "4" })}
        >
          キャンセル完了
        </Text>
        <Text className={css({ color: "fg.muted" })}>
          ご予約のキャンセルが完了しました。確認メールをお送りしました。
        </Text>
      </div>
    );
  }

  return (
    <div
      className={css({ maxW: "lg", mx: "auto", p: "8", textAlign: "center" })}
    >
      <Text
        as="h1"
        className={css({ fontSize: "3xl", fontWeight: "bold", mb: "4" })}
      >
        予約キャンセル
      </Text>
      <Text className={css({ mb: "8", color: "fg.muted" })}>
        予約をキャンセルしますか？この操作は取り消せません。
      </Text>

      {errorMessage && (
        <Text className={css({ color: "red.500", mb: "4", fontSize: "sm" })}>
          {errorMessage}
        </Text>
      )}

      <Button
        onClick={handleCancel}
        loading={status === "loading"}
        loadingText="キャンセル中..."
        variant="outline"
      >
        予約をキャンセルする
      </Button>
    </div>
  );
}
