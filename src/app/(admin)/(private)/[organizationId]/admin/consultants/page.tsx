"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Pencil, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { ActiveStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { getGetAdminConsultantsQueryKey } from "@/generated/api/admin/admin";
import { useAdminConsultants } from "@/hooks/use-admin-consultants";
import { useInviteUser } from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function AdminConsultantsPage() {
  const { buildPath, organizationId } = useOrganizationRouting();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminConsultants();
  const inviteUser = useInviteUser();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const consultants = data?.data?.consultants ?? [];
  const isAdmin = role === "admin";

  const handleInviteConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !inviteEmail) {
      return;
    }
    try {
      await inviteUser.mutateAsync({
        organizationId,
        data: { email: inviteEmail, role: "consultant" },
      });
      toaster.success({
        title: "成功",
        description: `${inviteEmail} に招待メールを送信しました`,
      });
      setInviteEmail("");
      setInviteOpen(false);
      await queryClient.invalidateQueries({
        queryKey: getGetAdminConsultantsQueryKey(organizationId),
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

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
        <TableSkeleton columns={5} rows={5} />
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
        {isAdmin && (
          <Dialog.Root
            open={inviteOpen}
            onOpenChange={(details) => setInviteOpen(details.open)}
          >
            <Dialog.Trigger asChild>
              <Button>
                <UserPlus size={16} />
                新規追加
              </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>相談員招待</Dialog.Title>
                  <Dialog.Description>
                    相談員として招待するメールアドレスを入力してください
                  </Dialog.Description>
                </Dialog.Header>
                <styled.form onSubmit={handleInviteConsultant}>
                  <Dialog.Body>
                    <Field.Root>
                      <Field.Label>メールアドレス</Field.Label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </Field.Root>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.CloseTrigger asChild>
                      <Button variant="outline">キャンセル</Button>
                    </Dialog.CloseTrigger>
                    <Button
                      type="submit"
                      loading={inviteUser.isPending}
                      loadingText="送信中..."
                    >
                      招待メール送信
                    </Button>
                  </Dialog.Footer>
                </styled.form>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        )}
      </styled.div>
      {consultants.length === 0 ? (
        <EmptyState
          icon={Users}
          message="相談員はいません"
          hint={
            isAdmin
              ? "新規追加ボタンから相談員を登録できます"
              : "管理者に相談員追加を依頼してください"
          }
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>名前</Table.Header>
              <Table.Header>メールアドレス</Table.Header>
              <Table.Header>専門分野</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {consultants.map((c) => (
              <Table.Row key={c.consultantId}>
                <Table.Cell>{c.displayName}</Table.Cell>
                <Table.Cell>{c.email}</Table.Cell>
                <Table.Cell>{c.specialties.join(", ")}</Table.Cell>
                <Table.Cell>
                  <ActiveStatusBadge isActive={c.isActive} />
                </Table.Cell>
                <Table.Cell>
                  <Tooltip content="編集">
                    <IconButton variant="subtle" size="sm" asChild>
                      <Link
                        href={buildPath(`/admin/consultants/${c.consultantId}`)}
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
