"use client";

import { CalendarDays, CircleAlert, CreditCard, House } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAdminBookings } from "@/hooks/use-admin-bookings";
import { useAdminCustomers } from "@/hooks/use-admin-customers";
import { useAdminPayments } from "@/hooks/use-admin-payments";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { buildAdminHomeViewModel } from "./home-view-model";

function formatDatetime(value: string): string {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminHomePage() {
  const { buildPath } = useOrganizationRouting();
  const { hasPermission } = useAuth();
  const canManageSettings = hasPermission("admin.settings.manage");
  const bookingsQuery = useAdminBookings({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const paymentsQuery = useAdminPayments({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const customersQuery = useAdminCustomers(
    {
      page: 1,
      pageSize: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    { enabled: true },
  );

  const isLoading =
    bookingsQuery.isLoading ||
    paymentsQuery.isLoading ||
    customersQuery.isLoading;
  const bookings = bookingsQuery.data?.data?.bookings ?? [];
  const payments = paymentsQuery.data?.data?.payments ?? [];
  const customers = customersQuery.data?.data?.customers ?? [];
  const viewModel = useMemo(
    () =>
      buildAdminHomeViewModel({
        bookings,
        payments,
        customers,
      }),
    [bookings, payments, customers],
  );

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="6">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            ホーム
          </Text>
          <Text textStyle="sm" color="fg.muted">
            今日の優先タスクと運用状況を確認できます。
          </Text>
        </styled.div>

        <styled.div
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))"
          gap="3"
          mb="6"
        >
          <Skeleton height="120px" rounded="l2" />
          <Skeleton height="120px" rounded="l2" />
          <Skeleton height="120px" rounded="l2" />
        </styled.div>

        <styled.div
          display="grid"
          gridTemplateColumns={{ base: "1fr", lg: "1fr 1fr" }}
          gap="4"
        >
          <Skeleton height="260px" rounded="l2" />
          <Skeleton height="260px" rounded="l2" />
        </styled.div>
      </styled.div>
    );
  }

  if (bookingsQuery.error || paymentsQuery.error || customersQuery.error) {
    return (
      <EmptyState
        icon={CircleAlert}
        message="ホーム情報の取得に失敗しました"
        hint="しばらく経ってから再度お試しください"
      />
    );
  }

  return (
    <styled.div>
      <styled.div mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          ホーム
        </Text>
        <Text textStyle="sm" color="fg.muted">
          今日の優先タスクと運用状況を確認できます。
        </Text>
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gap="3"
        mb="6"
      >
        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <Text textStyle="xs" color="fg.muted" mb="1">
            本日対応ToDo
          </Text>
          <Text textStyle="lg" fontWeight="bold" mb="2">
            未対応予約
          </Text>
          <Text textStyle="3xl" fontWeight="bold" mb="3">
            {viewModel.todo.upcomingUnprocessedCount}
          </Text>
          <Button size="sm" variant="outline" asChild>
            <Link href={buildPath("/admin/bookings")}>予約管理を開く</Link>
          </Button>
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <Text textStyle="xs" color="fg.muted" mb="1">
            本日対応ToDo
          </Text>
          <Text textStyle="lg" fontWeight="bold" mb="2">
            本決済待ち
          </Text>
          <Text textStyle="3xl" fontWeight="bold" mb="3">
            {viewModel.todo.chargePendingCount}
          </Text>
          <Button size="sm" variant="outline" asChild>
            <Link href={buildPath("/admin/payments")}>決済管理を開く</Link>
          </Button>
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="4">
          <Text textStyle="xs" color="fg.muted" mb="1">
            本日対応ToDo
          </Text>
          <Text textStyle="lg" fontWeight="bold" mb="2">
            メモ未入力
          </Text>
          <Text textStyle="3xl" fontWeight="bold" mb="3">
            {viewModel.todo.memoMissingCount}
          </Text>
          {canManageSettings ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={buildPath("/admin/settings")}>設定を編集する</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled>
                設定を編集する
              </Button>
              <Text textStyle="xs" color="fg.muted" mt="2">
                このロールでは設定の閲覧のみ可能です。
              </Text>
            </>
          )}
        </styled.div>
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        gap="4"
      >
        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="5">
          <styled.div
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="4"
          >
            <Text as="h2" textStyle="lg" fontWeight="bold">
              直近開始予約
            </Text>
            <styled.div
              display="inline-flex"
              alignItems="center"
              gap="1"
              color="fg.muted"
            >
              <CalendarDays size={16} />
              <Text textStyle="xs">最大5件</Text>
            </styled.div>
          </styled.div>

          {viewModel.upcomingBookings.length === 0 ? (
            <EmptyState
              icon={House}
              message="直近開始予約はありません"
              hint="予約が入るとここに表示されます"
            />
          ) : (
            <styled.div display="flex" flexDir="column" gap="2">
              {viewModel.upcomingBookings.map((booking) => (
                <styled.div
                  key={booking.bookingId}
                  rounded="l2"
                  borderWidth="1px"
                  borderColor="border"
                  p="3"
                >
                  <styled.div display="flex" alignItems="center" gap="2" mb="1">
                    <Text textStyle="sm" fontWeight="bold">
                      {formatDatetime(booking.startsAt)}
                    </Text>
                    <BookingStatusBadge status={booking.status} />
                  </styled.div>
                  <Text textStyle="sm" color="fg.muted">
                    顧客: {booking.customerName}
                  </Text>
                </styled.div>
              ))}
            </styled.div>
          )}
        </styled.div>

        <styled.div rounded="l2" borderWidth="1px" borderColor="border" p="5">
          <styled.div
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="4"
          >
            <Text as="h2" textStyle="lg" fontWeight="bold">
              要対応決済
            </Text>
            <styled.div
              display="inline-flex"
              alignItems="center"
              gap="1"
              color="fg.muted"
            >
              <CreditCard size={16} />
              <Text textStyle="xs">最大5件</Text>
            </styled.div>
          </styled.div>

          {viewModel.chargeableBookings.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              message="要対応決済はありません"
              hint="本決済待ちの予約がある場合に表示されます"
            />
          ) : (
            <styled.div display="flex" flexDir="column" gap="2">
              {viewModel.chargeableBookings.map((booking) => (
                <styled.div
                  key={booking.bookingId}
                  rounded="l2"
                  borderWidth="1px"
                  borderColor="border"
                  p="3"
                >
                  <styled.div
                    display="flex"
                    alignItems="center"
                    gap="2"
                    mb="1"
                    flexWrap="wrap"
                  >
                    <Text textStyle="sm" fontWeight="bold">
                      {formatDatetime(booking.startsAt)}
                    </Text>
                    {booking.paymentStatus && (
                      <PaymentStatusBadge status={booking.paymentStatus} />
                    )}
                  </styled.div>
                  <Text textStyle="sm" color="fg.muted">
                    顧客: {booking.customerName}
                  </Text>
                </styled.div>
              ))}
            </styled.div>
          )}
        </styled.div>
      </styled.div>
    </styled.div>
  );
}
