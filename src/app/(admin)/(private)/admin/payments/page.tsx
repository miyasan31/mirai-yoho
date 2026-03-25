"use client";

import { styled } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminPayments } from "@/hooks/use-admin-payments";

export default function AdminPaymentsPage() {
  const { data, isLoading } = useAdminPayments();

  const payments = data?.data?.payments ?? [];

  if (isLoading) return <Spinner />;

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        決済管理
      </Text>
      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.Header>予約ID</Table.Header>
            <Table.Header>金額</Table.Header>
            <Table.Header>税額</Table.Header>
            <Table.Header>合計</Table.Header>
            <Table.Header>ステータス</Table.Header>
            <Table.Header>方式</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {payments.map((p) => (
            <Table.Row key={p.paymentId}>
              <Table.Cell>{p.bookingId}</Table.Cell>
              <Table.Cell>{p.amountJPY.toLocaleString()}円</Table.Cell>
              <Table.Cell>{p.taxAmountJPY.toLocaleString()}円</Table.Cell>
              <Table.Cell>{p.totalJPY.toLocaleString()}円</Table.Cell>
              <Table.Cell>{p.status}</Table.Cell>
              <Table.Cell>{p.captureMethod ?? "-"}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {payments.length === 0 && <Text mt="4">決済はありません</Text>}
    </styled.div>
  );
}
