import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { useCancelConsultantBooking } from "@/hooks/use-consultant-bookings";

interface ConsultantCancelControlProps {
  bookingId: string;
  status: string;
  onCancelled?: () => void;
}

export function ConsultantCancelControl({
  bookingId,
  status,
  onCancelled,
}: ConsultantCancelControlProps) {
  const { organizationId } = useOrganizationRouting();
  const cancelConsultantBooking = useCancelConsultantBooking();
  const [open, setOpen] = useState(false);

  if (status !== "pending" && status !== "confirmed") {
    return null;
  }

  const handleCancel = async () => {
    if (!organizationId) return;

    try {
      await cancelConsultantBooking.mutateAsync({
        organizationId,
        bookingId,
      });
      toaster.create({
        type: "success",
        title: "予約をキャンセルしました",
        description: "顧客に全額返金メールを送信しました",
      });
      setOpen(false);
      onCancelled?.();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const isPending =
    cancelConsultantBooking.isPending &&
    cancelConsultantBooking.variables?.bookingId === bookingId;

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="outline" colorPalette="red">
          相談員都合キャンセル
        </Button>
      </Dialog.Trigger>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Title>予約をキャンセルしますか？</Dialog.Title>
          <Dialog.Description asChild>
            <styled.div display="flex" flexDir="column" gap="2">
              <Text textStyle="sm">
                相談員都合のキャンセルとして扱い、顧客には予約合計を全額返金します。
              </Text>
              <Text textStyle="sm" color="fg.muted">
                この操作は取り消せません。
              </Text>
            </styled.div>
          </Dialog.Description>
          <styled.div display="flex" justifyContent="flex-end" gap="2" mt="4">
            <Dialog.CloseTrigger asChild>
              <Button variant="outline" size="sm">
                閉じる
              </Button>
            </Dialog.CloseTrigger>
            <Button
              size="sm"
              colorPalette="red"
              loading={isPending}
              loadingText="実行中..."
              onClick={() => void handleCancel()}
            >
              キャンセルを確定する
            </Button>
          </styled.div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
