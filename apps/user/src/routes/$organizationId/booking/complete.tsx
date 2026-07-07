import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import { styled } from "styled-system/jsx";

interface CompleteSearch {
  bookingId?: string;
  joinUrl?: string;
  mode?: string;
}

export const Route = createFileRoute("/$organizationId/booking/complete")({
  validateSearch: (search: Record<string, unknown>): CompleteSearch => ({
    bookingId:
      typeof search.bookingId === "string" ? search.bookingId : undefined,
    joinUrl: typeof search.joinUrl === "string" ? search.joinUrl : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  component: BookingCompletePage,
});

function BookingCompletePage() {
  const { bookingId, joinUrl, mode } = Route.useSearch();
  const { organizationId } = Route.useParams();

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
            予約ID: {bookingId}
          </Text>
        </Tooltip>
      )}

      {joinUrl && (
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
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="colorPalette.default"
            textDecoration="underline"
            wordBreak="break-all"
            _hover={{ color: "colorPalette.emphasized" }}
          >
            {joinUrl}
          </styled.a>
        </styled.div>
      )}

      <Button asChild variant="outline">
        <Link to="/$organizationId/consultants" params={{ organizationId }}>
          相談員一覧に戻る
        </Link>
      </Button>
    </styled.div>
  );
}
