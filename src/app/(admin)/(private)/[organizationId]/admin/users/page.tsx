"use client";

import { createListCollection } from "@ark-ui/react/select";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { UserStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import * as Select from "@/components/ui/select";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  InviteUserBodyRole,
  UpdateUserRoleBodyRole,
} from "@/generated/schemas";
import {
  useAdminUsers,
  useAdminUsersQueryKey,
  useDeleteAdminUser,
  useInviteUser,
  useResendUserInvite,
  useResetUserPassword,
  useUpdateUserDisplayName,
  useUpdateUserRole,
} from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

const inviteRoleCollection = createListCollection({
  items: [
    { label: "管理者", value: "admin" },
    { label: "オペレーター", value: "operator" },
  ],
});

const editRoleCollection = createListCollection({
  items: [
    { label: "管理者", value: "admin" },
    { label: "相談員", value: "consultant" },
    { label: "オペレーター", value: "operator" },
  ],
});

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  operator: "オペレーター",
  consultant: "相談員",
};

export default function AdminUsersPage() {
  const { organizationId } = useOrganizationRouting();
  const { role } = useAuth();
  const { data, isLoading } = useAdminUsers();
  const queryKey = useAdminUsersQueryKey();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteUserBodyRole>("operator");
  const inviteUser = useInviteUser();

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleUid, setEditRoleUid] = useState("");
  const [editRoleValue, setEditRoleValue] =
    useState<UpdateUserRoleBodyRole>("consultant");
  const updateUserRole = useUpdateUserRole();
  const [editDisplayNameOpen, setEditDisplayNameOpen] = useState(false);
  const [editDisplayNameUid, setEditDisplayNameUid] = useState("");
  const [editDisplayNameValue, setEditDisplayNameValue] = useState("");
  const updateUserDisplayName = useUpdateUserDisplayName();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUid, setDeleteUid] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const deleteAdminUser = useDeleteAdminUser();

  const resendUserInvite = useResendUserInvite();
  const resetUserPassword = useResetUserPassword();

  if (!organizationId || role !== "admin") {
    return <Text>権限がありません</Text>;
  }

  const users = data?.data?.users ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey,
    });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteDisplayName.trim()) {
      return;
    }
    try {
      await inviteUser.mutateAsync({
        organizationId,
        data: {
          email: inviteEmail,
          displayName: inviteDisplayName.trim(),
          role: inviteRole,
        },
      });
      toaster.success({
        title: "成功",
        description: `${inviteEmail} に招待メールを送信しました`,
      });
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteOpen(false);
      await invalidate();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserRole.mutateAsync({
        organizationId,
        uid: editRoleUid,
        data: { role: editRoleValue },
      });
      toaster.success({
        title: "成功",
        description: `ロールを ${ROLE_LABELS[editRoleValue] ?? editRoleValue} に変更しました`,
      });
      setEditRoleOpen(false);
      await invalidate();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleEditDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDisplayNameValue.trim()) {
      return;
    }
    try {
      await updateUserDisplayName.mutateAsync({
        organizationId,
        uid: editDisplayNameUid,
        data: { displayName: editDisplayNameValue.trim() },
      });
      toaster.success({
        title: "成功",
        description: "表示名を更新しました",
      });
      setEditDisplayNameOpen(false);
      await invalidate();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleResendInvite = async (uid: string, email: string) => {
    try {
      await resendUserInvite.mutateAsync({ organizationId, uid });
      toaster.success({
        title: "成功",
        description: `${email} に招待メールを再送しました`,
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleResetPassword = async (uid: string, email: string) => {
    try {
      await resetUserPassword.mutateAsync({ organizationId, uid });
      toaster.success({
        title: "成功",
        description: `${email} にパスワードリセットメールを送信しました`,
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAdminUser.mutateAsync({ organizationId, uid: deleteUid });
      toaster.success({
        title: "成功",
        description: `${deleteEmail} を削除しました`,
      });
      setDeleteOpen(false);
      await invalidate();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  return (
    <styled.div>
      <styled.div
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb="4"
      >
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          ユーザー管理
        </Text>

        <Dialog.Root
          open={inviteOpen}
          onOpenChange={(e) => setInviteOpen(e.open)}
        >
          <Dialog.Trigger asChild>
            <Button>
              <UserPlus size={16} />
              ユーザー招待
            </Button>
          </Dialog.Trigger>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>ユーザー招待</Dialog.Title>
                <Dialog.Description>
                  メールアドレス・表示名・ロールを入力してください
                </Dialog.Description>
              </Dialog.Header>
              <styled.form onSubmit={handleInvite}>
                <Dialog.Body display="flex" flexDir="column" gap="4">
                  <Field.Root>
                    <Field.Label>メールアドレス</Field.Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>表示名</Field.Label>
                    <Input
                      value={inviteDisplayName}
                      onChange={(e) => setInviteDisplayName(e.target.value)}
                      required
                    />
                  </Field.Root>
                  <Select.Root
                    collection={inviteRoleCollection}
                    value={[inviteRole]}
                    onValueChange={(details) =>
                      setInviteRole(details.value[0] as InviteUserBodyRole)
                    }
                  >
                    <Select.Label>ロール</Select.Label>
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="ロールを選択" />
                        <Select.Indicator />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {inviteRoleCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
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
      </styled.div>

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          message="ユーザーはいません"
          hint="ユーザー招待ボタンから招待できます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>メール</Table.Header>
              <Table.Header>表示名</Table.Header>
              <Table.Header>ロール</Table.Header>
              <Table.Header>ステータス</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {users.map((user) => (
              <Table.Row key={user.uid}>
                <Table.Cell>{user.email}</Table.Cell>
                <Table.Cell>{user.displayName || user.email || "-"}</Table.Cell>
                <Table.Cell>{ROLE_LABELS[user.role] ?? user.role}</Table.Cell>
                <Table.Cell>
                  <UserStatusBadge status={user.status} />
                </Table.Cell>
                <Table.Cell>
                  <styled.div display="flex" gap="1">
                    {(user.role === "admin" || user.role === "operator") && (
                      <Tooltip content="表示名変更">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setEditDisplayNameUid(user.uid);
                            setEditDisplayNameValue(
                              user.displayName || user.email || "",
                            );
                            setEditDisplayNameOpen(true);
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {user.role !== "admin" && user.status !== "pending" && (
                      <Tooltip content="ロール変更">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setEditRoleUid(user.uid);
                            setEditRoleValue(
                              user.role as UpdateUserRoleBodyRole,
                            );
                            setEditRoleOpen(true);
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {user.role !== "admin" && user.status === "pending" && (
                      <Tooltip content="招待メール再送">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            handleResendInvite(user.uid, user.email)
                          }
                          loading={
                            resendUserInvite.isPending &&
                            resendUserInvite.variables?.uid === user.uid
                          }
                        >
                          <Mail size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {user.role !== "admin" && user.status !== "pending" && (
                      <Tooltip content="パスワードリセット">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            handleResetPassword(user.uid, user.email)
                          }
                          loading={
                            resetUserPassword.isPending &&
                            resetUserPassword.variables?.uid === user.uid
                          }
                        >
                          <KeyRound size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {user.role !== "admin" && (
                      <Tooltip content="削除">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          colorPalette="red"
                          onClick={() => {
                            setDeleteUid(user.uid);
                            setDeleteEmail(user.email);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </styled.div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {/* ロール編集ダイアログ */}
      <Dialog.Root
        open={editRoleOpen}
        onOpenChange={(e) => setEditRoleOpen(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>ロール変更</Dialog.Title>
            </Dialog.Header>
            <styled.form onSubmit={handleEditRole}>
              <Dialog.Body>
                <Select.Root
                  collection={editRoleCollection}
                  value={[editRoleValue]}
                  onValueChange={(details) =>
                    setEditRoleValue(details.value[0] as UpdateUserRoleBodyRole)
                  }
                >
                  <Select.Label>ロール</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="ロールを選択" />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {editRoleCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button variant="outline">キャンセル</Button>
                </Dialog.CloseTrigger>
                <Button
                  type="submit"
                  loading={updateUserRole.isPending}
                  loadingText="変更中..."
                >
                  変更する
                </Button>
              </Dialog.Footer>
            </styled.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* 表示名編集ダイアログ */}
      <Dialog.Root
        open={editDisplayNameOpen}
        onOpenChange={(e) => setEditDisplayNameOpen(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>表示名変更</Dialog.Title>
            </Dialog.Header>
            <styled.form onSubmit={handleEditDisplayName}>
              <Dialog.Body>
                <Field.Root>
                  <Field.Label>表示名</Field.Label>
                  <Input
                    value={editDisplayNameValue}
                    onChange={(e) => setEditDisplayNameValue(e.target.value)}
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
                  loading={updateUserDisplayName.isPending}
                  loadingText="変更中..."
                >
                  変更する
                </Button>
              </Dialog.Footer>
            </styled.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* 削除確認ダイアログ */}
      <Dialog.Root
        open={deleteOpen}
        onOpenChange={(e) => setDeleteOpen(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>ユーザー削除</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                <Text as="span" fontWeight="bold">
                  {deleteEmail}
                </Text>{" "}
                を削除しますか？この操作は取り消せません。
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette="red"
                onClick={handleDelete}
                loading={deleteAdminUser.isPending}
                loadingText="削除中..."
              >
                削除する
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </styled.div>
  );
}
