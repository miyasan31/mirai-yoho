import { useGetCustomerBookings } from "@mirai-yoho/api-client/api/customer/customer";
import type { CustomerBooking } from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/$organizationId/mypage/bookings")({
  component: MypageBookingsPage,
});

const STATUS_LABEL: Record<CustomerBooking["status"], string> = {
  pending: "未確定",
  confirmed: "確定",
  completed: "終了",
  cancelled: "キャンセル",
};

const STATUS_COLOR: Record<CustomerBooking["status"], string> = {
  pending: "yellow",
  confirmed: "green",
  completed: "gray",
  cancelled: "red",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MypageBookingsPage() {
  const { organizationId } = Route.useParams();
  const { isSignedUp } = useCustomerAuth();
  const bookingsQuery = useGetCustomerBookings(organizationId, {
    query: { enabled: isSignedUp && !!organizationId },
  });
  const bookings = bookingsQuery.data?.data?.bookings ?? null;

  const now = Date.now();
  const upcoming = bookings?.filter(
    (b) =>
      (b.status === "pending" || b.status === "confirmed") &&
      new Date(b.startsAt).getTime() > now,
  );
  const past = bookings?.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "cancelled" ||
      new Date(b.startsAt).getTime() <= now,
  );

  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        予約履歴
      </Text>
      {bookingsQuery.isError && (
        <Text color="fg.error">予約履歴の取得に失敗しました</Text>
      )}
      {bookings === null ? (
        <Spinner />
      ) : (
        <>
          <BookingSection title="今後の予約" items={upcoming ?? []} />
          <BookingSection title="過去の予約" items={past ?? []} />
        </>
      )}
    </styled.div>
  );
}

function BookingSection({
  title,
  items,
}: {
  title: string;
  items: CustomerBooking[];
}) {
  return (
    <styled.section display="flex" flexDir="column" gap="2">
      <Text as="h2" textStyle="lg" fontWeight="medium">
        {title}
      </Text>
      {items.length === 0 ? (
        <Text color="fg.muted" textStyle="sm">
          予約はありません。
        </Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2">
          {items.map((booking) => (
            <styled.li
              key={booking.bookingId}
              border="1px solid"
              borderColor="border"
              rounded="l2"
              p="3"
              display="flex"
              flexDir="column"
              gap="1"
            >
              <styled.div display="flex" alignItems="center" gap="2">
                <Text fontWeight="medium">
                  {formatDateTime(booking.startsAt)}
                </Text>
                <Badge colorPalette={STATUS_COLOR[booking.status]}>
                  {STATUS_LABEL[booking.status]}
                </Badge>
              </styled.div>
              {booking.pricePlanName && (
                <Text textStyle="sm" color="fg.muted">
                  {booking.pricePlanName}
                  {booking.pricePlanTotalJPY
                    ? ` / ${booking.pricePlanTotalJPY.toLocaleString()}円`
                    : ""}
                </Text>
              )}
              {booking.joinUrl && booking.status === "confirmed" && (
                <styled.a
                  href={booking.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  textStyle="sm"
                  color="fg.accent"
                >
                  Zoom 参加リンク
                </styled.a>
              )}
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.section>
  );
}
