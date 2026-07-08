import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { BookingStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CircleAlert,
  Clock,
  ExternalLink,
  UserCircle,
} from "lucide-react";
import { useMemo } from "react";
import { styled } from "styled-system/jsx";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { ConsultantJoinControl } from "../bookings/consultant-join-control";
import { buildConsultantHomeViewModel } from "./home-view-model";

function formatDatetime(value: string): string {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultantHomePage() {
  const { buildPath } = useOrganizationRouting();
  const { data, isLoading, refetch } = useConsultantBookings({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const bookings = data?.data?.bookings ?? [];

  const viewModel = useMemo(
    () => buildConsultantHomeViewModel(bookings),
    [bookings],
  );

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="6">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            ホーム
          </Text>
          <Text textStyle="sm" color="fg.muted">
            今日の優先タスクと担当状況を確認できます。
          </Text>
        </styled.div>

        <styled.div display="grid" gap="4" mb="6">
          <Skeleton height="140px" rounded="l2" />
          <Skeleton height="180px" rounded="l2" />
        </styled.div>

        <styled.div
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))"
          gap="3"
        >
          <Skeleton height="96px" rounded="l2" />
          <Skeleton height="96px" rounded="l2" />
          <Skeleton height="96px" rounded="l2" />
          <Skeleton height="96px" rounded="l2" />
        </styled.div>
      </styled.div>
    );
  }

  const { nextBooking, todayBookings, summary } = viewModel;

  return (
    <styled.div>
      <styled.div mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          ホーム
        </Text>
        <Text textStyle="sm" color="fg.muted">
          今日の優先タスクと担当状況を確認できます。
        </Text>
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns={{ base: "1fr", lg: "2fr 1fr" }}
        gap="4"
        mb="6"
      >
        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="5">
          <Text textStyle="sm" color="fg.muted" mb="2">
            次の予約
          </Text>
          {nextBooking ? (
            <>
              <styled.div display="flex" alignItems="center" gap="2" mb="2">
                <Text textStyle="lg" fontWeight="bold">
                  {formatDatetime(nextBooking.startsAt)}
                </Text>
                <BookingStatusBadge status={nextBooking.status} />
              </styled.div>
              <Text textStyle="sm" mb="4">
                顧客: {nextBooking.customerName}
              </Text>
              <styled.div mb="4">
                <ConsultantJoinControl
                  bookingId={nextBooking.bookingId}
                  startsAt={nextBooking.startsAt}
                  status={nextBooking.status}
                  consultantJoinedAt={nextBooking.consultantJoinedAt}
                  onJoined={() => {
                    void refetch();
                  }}
                />
              </styled.div>
              <styled.div display="flex" gap="2" flexWrap="wrap">
                {nextBooking.joinUrl && (
                  <Button asChild size="sm">
                    <a
                      href={nextBooking.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <styled.span
                        display="inline-flex"
                        alignItems="center"
                        gap="1"
                      >
                        <ExternalLink size={14} />
                        Zoom参加
                      </styled.span>
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to={buildPath(
                      `/consultant/bookings/${nextBooking.bookingId}/memo`,
                    )}
                  >
                    鑑定メモ編集
                  </Link>
                </Button>
              </styled.div>
            </>
          ) : (
            <EmptyState
              icon={CalendarDays}
              message="未対応の次予約はありません"
              hint="新しい予約が入るとここに表示されます"
            />
          )}
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="5">
          <Text textStyle="sm" color="fg.muted" mb="2">
            クイックアクション
          </Text>
          <styled.div display="flex" flexDir="column" gap="2">
            <Button variant="outline" justifyContent="flex-start" asChild>
              <Link to={buildPath("/consultant/bookings")}>予約一覧を開く</Link>
            </Button>
            <Button variant="outline" justifyContent="flex-start" asChild>
              <Link to={buildPath("/consultant/slots")}>予約枠を調整する</Link>
            </Button>
            <Button variant="outline" justifyContent="flex-start" asChild>
              <Link to={buildPath("/consultant/profile")}>
                プロフィールを更新する
              </Link>
            </Button>
          </styled.div>
        </styled.div>
      </styled.div>

      <styled.div
        rounded="l2"
        borderWidth="1px"
        borderColor="border"
        p="5"
        mb="6"
      >
        <styled.div
          display="flex"
          alignItems={{ base: "flex-start", md: "center" }}
          justifyContent="space-between"
          gap="2"
          mb="4"
        >
          <Text as="h2" textStyle="lg" fontWeight="bold">
            今日の予約一覧
          </Text>
          <Text textStyle="sm" color="fg.muted">
            今日の担当件数: {todayBookings.length}件
          </Text>
        </styled.div>

        {todayBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            message="今日の予約はありません"
            hint="予約が入るとここに表示されます"
          />
        ) : (
          <styled.div display="flex" flexDir="column" gap="2">
            {todayBookings.map((booking) => (
              <styled.div
                key={booking.bookingId}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap="2"
                rounded="l2"
                borderWidth="1px"
                borderColor="border"
                p="3"
              >
                <styled.div>
                  <Text textStyle="sm" fontWeight="bold">
                    {formatDatetime(booking.startsAt)}
                  </Text>
                  <styled.div display="flex" alignItems="center" gap="2" mt="1">
                    <BookingStatusBadge status={booking.status} />
                    <Text textStyle="sm" color="fg.muted">
                      顧客: {booking.customerName}
                    </Text>
                  </styled.div>
                  <styled.div mt="2">
                    <ConsultantJoinControl
                      bookingId={booking.bookingId}
                      startsAt={booking.startsAt}
                      status={booking.status}
                      consultantJoinedAt={booking.consultantJoinedAt}
                      onJoined={() => {
                        void refetch();
                      }}
                    />
                  </styled.div>
                </styled.div>
                <styled.div
                  display="flex"
                  gap="2"
                  flexWrap="wrap"
                  justifyContent="flex-end"
                >
                  {booking.joinUrl && (
                    <Button size="sm" asChild>
                      <a
                        href={booking.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <styled.span
                          display="inline-flex"
                          alignItems="center"
                          gap="1"
                        >
                          <ExternalLink size={14} />
                          Zoom参加
                        </styled.span>
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={buildPath(
                        `/consultant/bookings/${booking.bookingId}/memo`,
                      )}
                    >
                      鑑定メモ編集
                    </Link>
                  </Button>
                </styled.div>
              </styled.div>
            ))}
          </styled.div>
        )}
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))"
        gap="3"
      >
        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <styled.div display="flex" alignItems="center" gap="2" mb="1">
            <CalendarDays size={16} />
            <Text textStyle="xs" color="fg.muted">
              今日の担当件数
            </Text>
          </styled.div>
          <Text textStyle="3xl" fontWeight="bold">
            {summary.todayTotal}
          </Text>
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <styled.div display="flex" alignItems="center" gap="2" mb="1">
            <Clock size={16} />
            <Text textStyle="xs" color="fg.muted">
              残件数
            </Text>
          </styled.div>
          <Text textStyle="3xl" fontWeight="bold">
            {summary.todayRemaining}
          </Text>
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <styled.div display="flex" alignItems="center" gap="2" mb="1">
            <UserCircle size={16} />
            <Text textStyle="xs" color="fg.muted">
              完了件数
            </Text>
          </styled.div>
          <Text textStyle="3xl" fontWeight="bold">
            {summary.todayCompleted}
          </Text>
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <styled.div display="flex" alignItems="center" gap="2" mb="1">
            <CircleAlert size={16} />
            <Text textStyle="xs" color="fg.muted">
              メモ未入力件数
            </Text>
          </styled.div>
          <Text textStyle="3xl" fontWeight="bold">
            {summary.todayMemoMissing}
          </Text>
        </styled.div>
      </styled.div>
    </styled.div>
  );
}
