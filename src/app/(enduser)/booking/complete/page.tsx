"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";

export default function BookingCompletePage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const zoomUrl = searchParams.get("zoomUrl");
  const mode = searchParams.get("mode");

  const isSetupMode = mode === "setup";

  return (
    <styled.div maxW="lg" mx="auto" p="8" textAlign="center">
      <CheckCircle
        size={48}
        color="var(--colors-green-500)"
        style={{ margin: "0 auto 16px" }}
      />

      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        {isSetupMode
          ? "ご予約が完了しました"
          : "ご予約・お支払いが完了しました"}
      </Text>

      <Text color="fg.muted" mb="8">
        {isSetupMode
          ? "カード情報を登録しました。お支払いは相談実施後に確定します。確認メールをお送りしましたのでご確認ください。"
          : "お支払いが完了しました。確認メールをお送りしましたのでご確認ください。"}
      </Text>

      {bookingId && (
        <Tooltip content={bookingId}>
          <Text textStyle="sm" color="fg.muted" mb="4" cursor="default">
            予約ID: {bookingId.slice(0, 8)}...
          </Text>
        </Tooltip>
      )}

      {zoomUrl && (
        <styled.div
          mb="8"
          p="6"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          rounded="l2"
          textAlign="left"
        >
          <Text fontWeight="medium" mb="2">
            Zoom ミーティング URL
          </Text>
          <styled.a
            href={zoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="colorPalette.default"
            textDecoration="underline"
            wordBreak="break-all"
            _hover={{ color: "colorPalette.emphasized" }}
          >
            {zoomUrl}
          </styled.a>
        </styled.div>
      )}

      <Button asChild variant="outline">
        <Link href="/consultants">相談員一覧に戻る</Link>
      </Button>
    </styled.div>
  );
}
