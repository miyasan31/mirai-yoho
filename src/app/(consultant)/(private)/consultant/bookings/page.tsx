"use client";

import Link from "next/link";
import { styled } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";

export default function ConsultantBookingsPage() {
  const { data, isLoading } = useConsultantBookings();
  const bookings = data?.data?.bookings ?? [];

  if (isLoading) return <Spinner />;

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        予約一覧
      </Text>
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
              <Table.Cell>{b.status}</Table.Cell>
              <Table.Cell>
                {b.zoomUrl ? (
                  <a href={b.zoomUrl} target="_blank" rel="noopener noreferrer">
                    参加
                  </a>
                ) : (
                  "-"
                )}
              </Table.Cell>
              <Table.Cell>{b.consultantMemo || "-"}</Table.Cell>
              <Table.Cell>
                <Link href={`/consultant/bookings/${b.bookingId}/memo`}>
                  メモ編集
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {bookings.length === 0 && <Text mt="4">予約はありません</Text>}
    </styled.div>
  );
}
