import { useCancelMyBooking } from "@mirai-yoho/api-client/api/customer/customer";
import type { MyBooking } from "@mirai-yoho/api-client/schemas";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarX, CircleX, Video } from "lucide-react";
import { Suspense, useState } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSuspenseMyBookings } from "@/hooks/use-my-bookings";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/mypage/bookings")({
  head: () => pageHead("予約履歴"),
  errorComponent: MyBookingsError,
  component: MypageBookingsPage,
});

const STATUS_LABEL: Record<MyBooking["status"], string> = {
  pending: "未確定",
  confirmed: "確定",
  completed: "終了",
  cancelled: "キャンセル",
};

const STATUS_COLOR: Record<MyBooking["status"], string> = {
  pending: "yellow",
  confirmed: "green",
  completed: "gray",
  cancelled: "red",
};

function formatDateTime(iso: string): string {
  return format(parseISO(iso), "yyyy/MM/dd (E) HH:mm", { locale: ja });
}

function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: ja });
}

function formatDateTimeRange(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)}〜${formatTime(endIso)}`;
}

function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function BookingCardSkeleton() {
  return (
    <styled.div
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="4"
      display="flex"
      flexDir="column"
      gap="2"
    >
      <Skeleton height="6" width="60%" />
      <SkeletonText noOfLines={2} />
      <Skeleton height="10" width="40%" mt="2" />
    </styled.div>
  );
}

function MyBookingsPending() {
  return (
    <styled.div display="flex" flexDir="column" gap="3">
      <BookingCardSkeleton />
      <BookingCardSkeleton />
    </styled.div>
  );
}

function MyBookingsError() {
  return (
    <EmptyState
      icon={CircleX}
      message="予約一覧の取得に失敗しました"
      hint="時間をおいて再度お試しください"
    />
  );
}

function MypageBookingsPage() {
  const { isSignedUp } = useCustomerAuth();
  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        予約一覧
      </Text>
      {isSignedUp ? (
        <Suspense fallback={<MyBookingsPending />}>
          <MyBookingsList />
        </Suspense>
      ) : (
        <EmptyState
          icon={CalendarX}
          message="予約はありません"
          hint="サービスを予約してみましょう"
        />
      )}
    </styled.div>
  );
}

function MyBookingsList() {
  const { data } = useSuspenseMyBookings();
  const bookings = data.data.bookings;

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        message="予約はありません"
        hint="サービスを予約してみましょう"
      />
    );
  }

  const now = Date.now();
  // API は startsAt 降順で返すため、今後の予約は開始が早い順に並べ替える
  const upcoming = bookings
    .filter(
      (b) =>
        (b.status === "pending" || b.status === "confirmed") &&
        new Date(b.startsAt).getTime() > now,
    )
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const past = bookings.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "cancelled" ||
      new Date(b.startsAt).getTime() <= now,
  );

  return (
    <>
      <BookingSection title="今後の予約" items={upcoming} />
      <BookingSection title="過去の予約" items={past} />
    </>
  );
}

function BookingSection({
  title,
  items,
}: {
  title: string;
  items: MyBooking[];
}) {
  return (
    <styled.section display="flex" flexDir="column" gap="3">
      <Text as="h2" textStyle="lg" fontWeight="semibold">
        {title}
      </Text>
      {items.length === 0 ? (
        <Text color="fg.muted" textStyle="sm">
          該当する予約はありません
        </Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="3" listStyle="none">
          {items.map((booking) => (
            <BookingCard key={booking.bookingId} booking={booking} />
          ))}
        </styled.ul>
      )}
    </styled.section>
  );
}

function BookingCard({ booking }: { booking: MyBooking }) {
  const now = Date.now();
  const startsAtMs = new Date(booking.startsAt).getTime();
  const endsAtMs = new Date(booking.endsAt).getTime();
  const cancelDeadlineMs = new Date(booking.cancelDeadlineAt).getTime();
  const isCancellable =
    (booking.status === "pending" || booking.status === "confirmed") &&
    cancelDeadlineMs > now;
  const showJoinButton = booking.status === "confirmed" && !!booking.joinUrl;
  const isEnded = endsAtMs <= now;
  const canJoinNow = !isEnded && startsAtMs - now < 30 * 60 * 1000;
  const joinDisabledReason = isEnded
    ? "終了しました"
    : "開始30分前から参加できます";

  return (
    <styled.li
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="4"
      display="flex"
      flexDir="column"
      gap="3"
      shadow="sm"
    >
      <styled.div display="flex" alignItems="center" gap="3" flexWrap="wrap">
        <Text fontWeight="semibold" textStyle="md">
          {formatDateTimeRange(booking.startsAt, booking.endsAt)}
        </Text>
        <Badge colorPalette={STATUS_COLOR[booking.status]}>
          {STATUS_LABEL[booking.status]}
        </Badge>
      </styled.div>

      {booking.consultantName && (
        <Text textStyle="sm" color="fg.muted">
          担当: {booking.consultantName}
        </Text>
      )}

      {(booking.pricePlanName || booking.pricePlanTotalJPY != null) && (
        <styled.div display="flex" flexDir="column" gap="1">
          {booking.pricePlanName && (
            <Text textStyle="sm">{booking.pricePlanName}</Text>
          )}
          {booking.pricePlanTotalJPY != null && (
            <Text textStyle="sm" color="fg.muted">
              料金: {formatYen(booking.pricePlanTotalJPY)}
            </Text>
          )}
          {booking.couponDiscountJPY != null &&
            booking.couponDiscountJPY > 0 && (
              <Text textStyle="sm" color="fg.muted">
                クーポン割引: -{formatYen(booking.couponDiscountJPY)}
              </Text>
            )}
          {booking.discountedTotalJPY != null &&
            booking.discountedTotalJPY !== booking.pricePlanTotalJPY && (
              <Text textStyle="sm" fontWeight="semibold">
                お支払い金額: {formatYen(booking.discountedTotalJPY)}
              </Text>
            )}
        </styled.div>
      )}

      <styled.div display="flex" gap="2" flexWrap="wrap" mt="1">
        {showJoinButton &&
          booking.joinUrl &&
          (canJoinNow ? (
            <Button asChild variant="solid" colorPalette="blue" size="sm">
              <a
                href={booking.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Video size={16} />
                Zoom に参加
              </a>
            </Button>
          ) : (
            <Tooltip
              content={joinDisabledReason}
              positioning={{ placement: "top-start" }}
              showArrow
            >
              <styled.span display="inline-flex">
                <Button variant="solid" colorPalette="blue" size="sm" disabled>
                  <Video size={16} />
                  Zoom に参加
                </Button>
              </styled.span>
            </Tooltip>
          ))}
        {isCancellable && (
          <CancelButton
            bookingId={booking.bookingId}
            organizationId={booking.organizationId}
          />
        )}
      </styled.div>
    </styled.li>
  );
}

function CancelButton({
  bookingId,
  organizationId,
}: {
  bookingId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const cancelMutation = useCancelMyBooking({
    mutation: {
      onSuccess: async () => {
        toaster.create({
          type: "success",
          title: "予約をキャンセルしました",
        });
        await invalidateAfter.bookingCancel(queryClient, organizationId);
        setOpen(false);
      },
      onError: (error) => {
        toaster.create({
          type: "error",
          title:
            error instanceof Error ? error.message : "キャンセルに失敗しました",
        });
      },
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <Button variant="outline" colorPalette="red" size="sm">
          キャンセル
        </Button>
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
            <Button
              colorPalette="red"
              onClick={() => cancelMutation.mutate({ bookingId })}
              loading={cancelMutation.isPending}
              loadingText="キャンセル中..."
            >
              キャンセルする
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
