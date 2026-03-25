"use client";

import Link from "next/link";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAdminConsultants } from "@/hooks/use-admin-consultants";

export default function AdminConsultantsPage() {
  const { data, isLoading } = useAdminConsultants();

  const consultants = data?.data?.consultants ?? [];

  if (isLoading) return <Spinner />;

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
              <Table.Cell>{c.isActive ? "有効" : "無効"}</Table.Cell>
              <Table.Cell>
                <Link href={`/admin/consultants/${c.consultantId}`}>編集</Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {consultants.length === 0 && <Text mt="4">相談員はいません</Text>}
    </styled.div>
  );
}
