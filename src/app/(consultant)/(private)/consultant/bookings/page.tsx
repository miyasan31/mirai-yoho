"use client";

import { CalendarX, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { styled } from "styled-system/jsx";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";

const STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  pending: { label: "未確定", colorPalette: "blue" },
  confirmed: { label: "確定", colorPalette: "green" },
  completed: { label: "完了", colorPalette: "gray" },
  cancelled: { label: "キャンセル", colorPalette: "red" },
};

export default function ConsultantBookingsPage() {
  const { data, isLoading } = useConsultantBookings();
  const bookings = data?.data?.bookings ?? [];

  if (isLoading) {
    return (
      <styled.div>
        <Skeleton height="8" width="120px" mb="6" />
        <styled.div shadow="xs" rounded="l2" overflow="hidden">
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
              {[...Array(5)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                <Table.Row key={i}>
                  <Table.Cell>
                    <Skeleton height="4" width="160px" />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton height="5" width="60px" rounded="full" />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton height="8" width="8" rounded="l2" />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton height="4" width="100px" />
                  </Table.Cell>
                  <Table.Cell>
                    <Skeleton height="8" width="8" rounded="l2" />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="6">
        予約一覧
      </Text>

      {bookings.length === 0 ? (
        <styled.div
          display="flex"
          flexDir="column"
          alignItems="center"
          gap="3"
          py="16"
        >
          <CalendarX size={48} color="var(--colors-fg-subtle)" />
          <Text fontWeight="medium" color="fg.muted">
            予約はありません
          </Text>
          <Text textStyle="sm" color="fg.subtle">
            予約が入ると、ここに表示されます
          </Text>
        </styled.div>
      ) : (
        <styled.div shadow="xs" rounded="l2" overflow="hidden">
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
              {bookings.map((b) => {
                const status = STATUS_CONFIG[b.status];
                return (
                  <Table.Row key={b.bookingId}>
                    <Table.Cell>
                      {new Date(b.startDatetime).toLocaleString("ja-JP")}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        variant="subtle"
                        size="sm"
                        colorPalette={status?.colorPalette ?? "gray"}
                      >
                        {status?.label ?? b.status}
                      </Badge>
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
                            href={`/consultant/bookings/${b.bookingId}/memo`}
                          >
                            <Pencil size={16} />
                          </Link>
                        </IconButton>
                      </Tooltip>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </styled.div>
      )}
    </styled.div>
  );
}
