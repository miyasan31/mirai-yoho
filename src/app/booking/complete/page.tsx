"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function BookingCompletePage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const zoomUrl = searchParams.get("zoomUrl");
  const mode = searchParams.get("mode");

  const isSetupMode = mode === "setup";

  return (
    <div
      className={css({ maxW: "lg", mx: "auto", p: "8", textAlign: "center" })}
    >
      <Text
        as="h1"
        className={css({ fontSize: "3xl", fontWeight: "bold", mb: "4" })}
      >
        {isSetupMode
          ? "ご予約が完了しました"
          : "ご予約・お支払いが完了しました"}
      </Text>

      <Text className={css({ mb: "8", color: "fg.muted" })}>
        {isSetupMode
          ? "カード情報を登録しました。お支払いは相談実施後に確定します。確認メールをお送りしましたのでご確認ください。"
          : "お支払いが完了しました。確認メールをお送りしましたのでご確認ください。"}
      </Text>

      {bookingId && (
        <Text className={css({ fontSize: "sm", color: "fg.muted", mb: "4" })}>
          予約ID: {bookingId}
        </Text>
      )}

      {zoomUrl && (
        <div
          className={css({
            mb: "8",
            p: "6",
            border: "1px solid",
            borderColor: "border.default",
            borderRadius: "lg",
          })}
        >
          <Text fontWeight="medium" className={css({ mb: "2" })}>
            Zoom ミーティング URL
          </Text>
          <a
            href={zoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              color: "blue.500",
              textDecoration: "underline",
              wordBreak: "break-all",
            })}
          >
            {zoomUrl}
          </a>
        </div>
      )}

      <Button asChild variant="outline">
        <Link href="/consultants">相談員一覧に戻る</Link>
      </Button>
    </div>
  );
}
