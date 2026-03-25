"use client";

import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { ActiveStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useAdminConsultants } from "@/hooks/use-admin-consultants";

export default function AdminConsultantsPage() {
  const { data, isLoading } = useAdminConsultants();

  const consultants = data?.data?.consultants ?? [];

  if (isLoading) {
    return (
      <styled.div>
        <styled.div
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb="4"
        >
          <Text as="h1" textStyle="2xl" fontWeight="bold">
            相談員管理
          </Text>
        </styled.div>
        <TableSkeleton columns={4} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb="4"
      >
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          相談員管理
        </Text>
        <Button asChild>
          <Link href="/admin/consultants/new">新規追加</Link>
        </Button>
      </styled.div>
      {consultants.length === 0 ? (
        <EmptyState
          icon={Users}
          message="相談員はいません"
          hint="新規追加ボタンから相談員を登録できます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>名前</Table.Header>
              <Table.Header>専門分野</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {consultants.map((c) => (
              <Table.Row key={c.consultantId}>
                <Table.Cell>{c.displayName}</Table.Cell>
                <Table.Cell>{c.specialties.join(", ")}</Table.Cell>
                <Table.Cell>
                  <ActiveStatusBadge isActive={c.isActive} />
                </Table.Cell>
                <Table.Cell>
                  <Tooltip content="編集">
                    <IconButton variant="subtle" size="sm" asChild>
                      <Link href={`/admin/consultants/${c.consultantId}`}>
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
