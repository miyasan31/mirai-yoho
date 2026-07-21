import {
  getGetConsultantBookingsQueryKey,
  useCancelConsultantBooking,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { CircleX } from "lucide-react";

interface ConsultantCancelControlProps {
  bookingId: string;
  status: string;
}

export function ConsultantCancelControl({
  bookingId,
  status,
}: ConsultantCancelControlProps) {
  const { organizationId } = useOrganizationRouting();
  const queryClient = useQueryClient();
  const cancelConsultantBooking = useCancelConsultantBooking();

  const isCancellable = status === "pending" || status === "confirmed";
  if (!isCancellable) {
    return null;
  }

  const handleCancel = async () => {
    if (!organizationId) return;
    const confirmed = window.confirm(
      "この予約を占い師都合でキャンセルします。お客様には全額返金されます。よろしいですか？",
    );
    if (!confirmed) return;

    try {
      await cancelConsultantBooking.mutateAsync({
        organizationId,
        id: bookingId,
      });
      toaster.create({ type: "success", title: "予約をキャンセルしました" });
      await queryClient.invalidateQueries({
        queryKey: getGetConsultantBookingsQueryKey(organizationId),
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const isPending =
    cancelConsultantBooking.isPending &&
    cancelConsultantBooking.variables?.id === bookingId;

  return (
    <Tooltip content="占い師都合でキャンセル" showArrow>
      <IconButton
        variant="subtle"
        size="sm"
        colorPalette="red"
        loading={isPending}
        onClick={() => void handleCancel()}
      >
        <CircleX size={16} />
      </IconButton>
    </Tooltip>
  );
}
