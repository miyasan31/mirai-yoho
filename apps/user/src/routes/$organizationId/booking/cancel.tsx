import type { CancelBookingBody } from "@mirai-yoho/api-client/schemas";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, ShieldX } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useCancelBooking } from "@/hooks/use-booking";
import { pageHead } from "@/lib/head";

interface CancelSearch {
  token?: string;
}

export const Route = createFileRoute("/$organizationId/booking/cancel")({
  head: () => pageHead("予約キャンセル"),
  validateSearch: (search: Record<string, unknown>): CancelSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: CancelPage,
});

function CancelPage() {
  const { token } = Route.useSearch();
  const { organizationId } = Route.useParams();

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

  const handleCancel = () => {
    // エラーは custom-fetch の toaster で表示される
    cancelBooking.mutate({
      organizationId: organizationId ?? "",
      bookingId,
      data: { cancelledBy: "customer", token } satisfies CancelBookingBody,
    });
  };

  if (cancelBooking.isSuccess) {
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
                  loading={cancelBooking.isPending}
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
