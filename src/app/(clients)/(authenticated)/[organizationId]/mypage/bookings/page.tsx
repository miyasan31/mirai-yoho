"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface BookingItem {
  bookingId: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  startsAt: string;
  consultantId: string;
  joinUrl: string | null;
  pricePlanName: string | null;
  pricePlanTotalJPY: number | null;
}

const STATUS_LABEL: Record<BookingItem["status"], string> = {
  pending: "未確定",
  confirmed: "確定",
  completed: "終了",
  cancelled: "キャンセル",
};

const STATUS_COLOR: Record<BookingItem["status"], string> = {
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

export default function MypageBookingsPage() {
  const params = useParams();
  const organizationId =
    typeof params.organizationId === "string" ? params.organizationId : "";
  const { token } = useCustomerAuth();
  const [bookings, setBookings] = useState<BookingItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !organizationId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/organizations/${organizationId}/customers/me/bookings`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new Error("予約履歴の取得に失敗しました");
        }
        const data = (await response.json()) as { bookings: BookingItem[] };
        if (!cancelled) setBookings(data.bookings);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "取得に失敗しました");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, organizationId]);

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
      {error && <Text color="fg.error">{error}</Text>}
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
  items: BookingItem[];
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
