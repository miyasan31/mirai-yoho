import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useJoinConsultantBooking } from "@/hooks/use-consultant-bookings";

interface ConsultantJoinControlProps {
  bookingId: string;
  startsAt: string;
  status: string;
  consultantJoinedAt?: string | null;
  onJoined?: () => void;
}

function formatJoinedAt(value: string): string {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canJoinBooking(params: {
  startsAt: string;
  status: string;
  consultantJoinedAt?: string | null;
  now?: Date;
}): boolean {
  if (params.consultantJoinedAt) {
    return false;
  }

  if (params.status !== "pending" && params.status !== "confirmed") {
    return false;
  }

  const startsAt = new Date(params.startsAt);
  const joinAvailableAt = new Date(startsAt.getTime() - 15 * 60 * 1000);

  return (params.now ?? new Date()).getTime() >= joinAvailableAt.getTime();
}

export function ConsultantJoinControl({
  bookingId,
  startsAt,
  status,
  consultantJoinedAt,
  onJoined,
}: ConsultantJoinControlProps) {
  const { organizationId } = useOrganizationRouting();
  const queryClient = useQueryClient();
  const joinConsultantBooking = useJoinConsultantBooking();

  const handleJoin = async () => {
    if (!organizationId) return;

    try {
      await joinConsultantBooking.mutateAsync({
        organizationId,
        id: bookingId,
      });
      await invalidateAfter.consultantBookingMutation(
        queryClient,
        organizationId,
      );
      toaster.create({ type: "success", title: "入室を確認しました" });
      onJoined?.();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  if (consultantJoinedAt) {
    return (
      <Text textStyle="sm" color="fg.default">
        入室確認済み: {formatJoinedAt(consultantJoinedAt)}
      </Text>
    );
  }

  if (!canJoinBooking({ startsAt, status, consultantJoinedAt })) {
    if (status === "pending" || status === "confirmed") {
      return (
        <Text textStyle="sm" color="fg.muted">
          開始15分前から操作可能
        </Text>
      );
    }

    return (
      <Text textStyle="sm" color="fg.subtle">
        対象外
      </Text>
    );
  }

  const isPending =
    joinConsultantBooking.isPending &&
    joinConsultantBooking.variables?.id === bookingId;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void handleJoin()}
      loading={isPending}
      loadingText="確認中..."
    >
      入室確認
    </Button>
  );
}
