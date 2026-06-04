"use client";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { useJoinConsultantBooking } from "@/hooks/use-consultant-bookings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

interface ConsultantJoinControlProps {
  bookingId: string;
  startDatetime: string;
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
  startDatetime: string;
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

  const startAt = new Date(params.startDatetime);
  const joinAvailableAt = new Date(startAt.getTime() - 15 * 60 * 1000);

  return (params.now ?? new Date()).getTime() >= joinAvailableAt.getTime();
}

export function ConsultantJoinControl({
  bookingId,
  startDatetime,
  status,
  consultantJoinedAt,
  onJoined,
}: ConsultantJoinControlProps) {
  const { organizationId } = useOrganizationRouting();
  const joinConsultantBooking = useJoinConsultantBooking();

  const handleJoin = async () => {
    if (!organizationId) return;

    try {
      await joinConsultantBooking.mutateAsync({
        organizationId,
        id: bookingId,
      });
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

  if (!canJoinBooking({ startDatetime, status, consultantJoinedAt })) {
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
