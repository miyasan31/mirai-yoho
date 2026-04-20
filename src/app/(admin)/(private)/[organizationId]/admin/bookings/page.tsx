"use client";

import { CalendarDays } from "lucide-react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { BookingStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { TruncatedId } from "@/components/truncated-id";
import { Button } from "@/components/ui/button";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useAdminBookings } from "@/hooks/use-admin-bookings";
import { useChargePayment } from "@/hooks/use-booking";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function AdminBookingsPage() {
  const { organizationId } = useOrganizationRouting();
  const { data, isLoading } = useAdminBookings();
  const chargePayment = useChargePayment();

  const bookings = data?.data?.bookings ?? [];
  const formatBookingDatetime = (value: string) =>
    new Date(value).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCharge = async (bookingId: string) => {
    if (!organizationId) return;
    try {
      await chargePayment.mutateAsync({
        organizationId,
        bookingId,
        data: { method: "manual" },
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示するため、ここでは何もしない
    }
  };

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            予約管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            予約の状況を確認し、必要に応じて手動課金を実行する画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={5} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          予約管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          予約の状況を確認し、必要に応じて手動課金を実行する画面です。
        </Text>
      </styled.div>
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          message="予約はありません"
          hint="予約が作成されるとここに表示されます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>日時</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>クライアントID</Table.Header>
              <Table.Header>相談員ID</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {bookings.map((b) => {
              const chargeable =
                "chargeable" in b
                  ? Boolean(
                      (b as typeof b & { chargeable?: boolean }).chargeable,
                    )
                  : false;
              const chargeDisabledReason =
                "chargeDisabledReason" in b
                  ? (
                      b as typeof b & {
                        chargeDisabledReason?: string | null;
                      }
                    ).chargeDisabledReason
                  : null;

              return (
                <Table.Row key={b.bookingId}>
                  <Table.Cell>
                    {formatBookingDatetime(b.startDatetime)}
                  </Table.Cell>
                  <Table.Cell>
                    <BookingStatusBadge status={b.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <TruncatedId id={b.clientId} />
                  </Table.Cell>
                  <Table.Cell>
                    <TruncatedId id={b.consultantId} />
                  </Table.Cell>
                  <Table.Cell>
                    {b.status === "confirmed" && (
                      <Tooltip
                        content={chargeDisabledReason ?? ""}
                        disabled={chargeable || !chargeDisabledReason}
                        positioning={{ placement: "top-start" }}
                        showArrow
                      >
                        <styled.span display="inline-flex">
                          <Button
                            size="sm"
                            disabled={!chargeable}
                            onClick={() => handleCharge(b.bookingId)}
                            loading={
                              chargePayment.isPending &&
                              chargePayment.variables?.bookingId === b.bookingId
                            }
                            loadingText="処理中..."
                            w="fit-content"
                          >
                            課金
                          </Button>
                        </styled.span>
                      </Tooltip>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
