"use client";

import { Building2 } from "lucide-react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/table-skeleton";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminClients } from "@/hooks/use-admin-clients";

export default function AdminClientsPage() {
  const { data, isLoading } = useAdminClients();

  const clients = data?.data?.clients ?? [];

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            クライアント管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            利用者情報を一覧で確認し、連絡先や登録内容を参照する画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={4} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          クライアント管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          利用者情報を一覧で確認し、連絡先や登録内容を参照する画面です。
        </Text>
      </styled.div>
      {clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="クライアントはいません"
          hint="クライアントが登録されるとここに表示されます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>名前</Table.Header>
              <Table.Header>メール</Table.Header>
              <Table.Header>電話</Table.Header>
              <Table.Header>メモ</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {clients.map((c) => (
              <Table.Row key={c.clientId}>
                <Table.Cell>{c.name}</Table.Cell>
                <Table.Cell>{c.email}</Table.Cell>
                <Table.Cell>{c.phone}</Table.Cell>
                <Table.Cell>{c.memo ?? "-"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
