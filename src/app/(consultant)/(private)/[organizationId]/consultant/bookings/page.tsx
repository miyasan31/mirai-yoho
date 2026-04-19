"use client";

import { CalendarX, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { BookingStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function ConsultantBookingsPage() {
  const { buildPath } = useOrganizationRouting();
  const { data, isLoading } = useConsultantBookings();
  const bookings = data?.data?.bookings ?? [];

  if (isLoading) {
    return (
      <styled.div>
        <Skeleton height="8" width="120px" mb="4" />
        <TableSkeleton columns={5} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        予約一覧
      </Text>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          message="予約はありません"
          hint="予約が入ると、ここに表示されます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>日時</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>Zoom</Table.Header>
              <Table.Header>メモ</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {bookings.map((b) => (
              <Table.Row key={b.bookingId}>
                <Table.Cell>
                  {new Date(b.startDatetime).toLocaleString("ja-JP")}
                </Table.Cell>
                <Table.Cell>
                  <BookingStatusBadge status={b.status} />
                </Table.Cell>
                <Table.Cell>
                  {b.zoomUrl ? (
                    <Tooltip content="Zoom に参加" showArrow>
                      <IconButton variant="subtle" size="sm" asChild>
                        <a
                          href={b.zoomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Text color="fg.subtle">-</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text
                    color={b.consultantMemo ? "fg.default" : "fg.subtle"}
                    truncate
                    maxW="200px"
                  >
                    {b.consultantMemo || "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Tooltip content="メモ編集" showArrow>
                    <IconButton variant="subtle" size="sm" asChild>
                      <Link
                        href={buildPath(
                          `/consultant/bookings/${b.bookingId}/memo`,
                        )}
                      >
                        <Pencil size={16} />
                      </Link>
                    </IconButton>
                  </Tooltip>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
