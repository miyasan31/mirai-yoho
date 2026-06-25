"use client";

import { Building2 } from "lucide-react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { ListControls } from "@/components/list-controls";
import { TableSkeleton } from "@/components/table-skeleton";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminCustomers } from "@/hooks/use-admin-customers";
import { useListQueryParams } from "@/hooks/use-list-query-params";

export default function AdminCustomersPage() {
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data, isLoading } = useAdminCustomers({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });

  const customers = data?.data?.customers ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: customers.length,
    totalPages: 1,
  };

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
      {customers.length === 0 ? (
        <EmptyState
          icon={Building2}
          message="クライアントはいません"
          hint="クライアントが登録されるとここに表示されます"
        />
      ) : (
        <>
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
              {customers.map((c) => (
                <Table.Row key={c.customerId}>
                  <Table.Cell>{c.name}</Table.Cell>
                  <Table.Cell>{c.email}</Table.Cell>
                  <Table.Cell>{c.phone}</Table.Cell>
                  <Table.Cell>{c.memo ?? "-"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <ListControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            sortBy={sortBy}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortByChange={setSortBy}
          />
        </>
      )}
    </styled.div>
  );
}
