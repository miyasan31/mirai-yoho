"use client";

import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminBookings } from "@/hooks/use-admin-bookings";
import { useCapturePayment } from "@/hooks/use-booking";

export default function AdminBookingsPage() {
  const { data, isLoading } = useAdminBookings();
  const capturePayment = useCapturePayment();

  const bookings = data?.data?.bookings ?? [];

  const handleCapture = async (bookingId: string) => {
    try {
      await capturePayment.mutateAsync({
        bookingId,
        data: { method: "manual" },
      });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "キャプチャに失敗しました";
      alert(message);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        予約管理
      </Text>
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
          {bookings.map((b) => (
            <Table.Row key={b.bookingId}>
              <Table.Cell>
                {new Date(b.startDatetime).toLocaleString("ja-JP")}
              </Table.Cell>
              <Table.Cell>{b.status}</Table.Cell>
              <Table.Cell>{b.clientId}</Table.Cell>
              <Table.Cell>{b.consultantId}</Table.Cell>
              <Table.Cell>
                {b.status === "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => handleCapture(b.bookingId)}
                    loading={
                      capturePayment.isPending &&
                      capturePayment.variables?.bookingId === b.bookingId
                    }
                    loadingText="処理中..."
                  >
                    本決済
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {bookings.length === 0 && <Text mt="4">予約はありません</Text>}
    </styled.div>
  );
}
