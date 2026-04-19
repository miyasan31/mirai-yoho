"use client";

import { CreditCard } from "lucide-react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { PaymentStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { TruncatedId } from "@/components/truncated-id";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminPayments } from "@/hooks/use-admin-payments";

export default function AdminPaymentsPage() {
  const { data, isLoading } = useAdminPayments();

  const payments = data?.data?.payments ?? [];

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            決済管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            決済履歴とステータスを確認し、請求処理の状況を把握する画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={7} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          決済管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          決済履歴とステータスを確認し、請求処理の状況を把握する画面です。
        </Text>
      </styled.div>
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          message="決済はありません"
          hint="決済が発生するとここに表示されます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>予約ID</Table.Header>
              <Table.Header>金額</Table.Header>
              <Table.Header>税額</Table.Header>
              <Table.Header>合計</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>戦略</Table.Header>
              <Table.Header>方式</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {payments.map((p) => (
              <Table.Row key={p.paymentId}>
                <Table.Cell>
                  <TruncatedId id={p.bookingId} />
                </Table.Cell>
                <Table.Cell>{p.amountJPY.toLocaleString()}円</Table.Cell>
                <Table.Cell>{p.taxAmountJPY.toLocaleString()}円</Table.Cell>
                <Table.Cell>{p.totalJPY.toLocaleString()}円</Table.Cell>
                <Table.Cell>
                  <PaymentStatusBadge status={p.status} />
                </Table.Cell>
                <Table.Cell>{p.paymentStrategy}</Table.Cell>
                <Table.Cell>{p.chargeMethod ?? "-"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
