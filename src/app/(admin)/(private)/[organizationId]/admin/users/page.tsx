"use client";

import { createListCollection } from "@ark-ui/react/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  Contact,
  Mail,
  RotateCcwKey,
  ShieldAlert,
  Trash2,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { UserStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  canDeleteAdminUser,
  canEditDisplayName,
  canEditRole,
  canInviteAdminUsers,
  canManageAdminUsers,
  canResendInvite,
  canResetPassword,
} from "./user-permissions";

const inviteRoleCollection = createListCollection({
  items: [
    { label: "管理者", value: "admin" },
    { label: "オペレーター", value: "operator" },
  ],
});

const editRoleCollection = createListCollection({
  items: [
    { label: "管理者", value: "admin" },
    { label: "オペレーター", value: "operator" },
  ],
});

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  operator: "オペレーター",
  consultant: "相談員",
};

function isAdminPanelUserRole(role: string): role is "admin" | "operator" {
  return role === "admin" || role === "operator";
}

export default function AdminUsersPage() {
  const { organizationId } = useOrganizationRouting();
  const { role, user } = useAuth();
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
    useState<UpdateUserRoleBodyRole>("operator");
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

  if (!organizationId || !canManageAdminUsers(role)) {
    return <Text>権限がありません</Text>;
  }

  const users = (data?.data?.users ?? []).filter((user) =>
    isAdminPanelUserRole(user.role),
  );
  const currentUid = user?.uid;

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
        alignItems="flex-start"
        mb="4"
      >
        <styled.div>
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            ユーザー管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            管理者とオペレーターの招待・アカウント管理を行う画面です。
          </Text>
        </styled.div>

        {canInviteAdminUsers(role) && (
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
              <Dialog.Content asChild>
                <styled.form onSubmit={handleInvite}>
                  <Dialog.Header>
                    <Dialog.Title>ユーザー招待</Dialog.Title>
                    <Dialog.Description>
                      メールアドレス・表示名・ロールを入力してください
                    </Dialog.Description>
                  </Dialog.Header>
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
        )}
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
            {users.map((adminUser) => (
              <Table.Row
                key={adminUser.uid}
                bg={currentUid === adminUser.uid ? "blue.50" : undefined}
              >
                <Table.Cell>{adminUser.email}</Table.Cell>
                <Table.Cell>
                  <styled.div display="inline-flex" alignItems="center" gap="2">
                    <Text as="span">
                      {adminUser.displayName || adminUser.email || "-"}
                    </Text>
                    {currentUid === adminUser.uid && (
                      <styled.div
                        display="inline-flex"
                        alignItems="center"
                        gap="1"
                      >
                        <Badge
                          variant="subtle"
                          size="sm"
                          colorPalette="blue"
                          aria-label="現在ログイン中のユーザー"
                        >
                          あなた
                        </Badge>
                      </styled.div>
                    )}
                  </styled.div>
                </Table.Cell>
                <Table.Cell>
                  {ROLE_LABELS[adminUser.role] ?? adminUser.role}
                </Table.Cell>
                <Table.Cell>
                  <UserStatusBadge status={adminUser.status} />
                </Table.Cell>
                <Table.Cell>
                  <styled.div display="flex" gap="1">
                    {canEditDisplayName(role, user?.uid, adminUser.uid) && (
                      <Tooltip content="表示名変更">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setEditDisplayNameUid(adminUser.uid);
                            setEditDisplayNameValue(
                              adminUser.displayName || adminUser.email || "",
                            );
                            setEditDisplayNameOpen(true);
                          }}
                        >
                          <Contact size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEditRole(role, adminUser.status) && (
                      <Tooltip content="ロール変更">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setEditRoleUid(adminUser.uid);
                            setEditRoleValue(
                              adminUser.role as UpdateUserRoleBodyRole,
                            );
                            setEditRoleOpen(true);
                          }}
                        >
                          <ShieldAlert size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canResendInvite(role, adminUser.status) && (
                      <Tooltip content="招待メール再送">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            handleResendInvite(adminUser.uid, adminUser.email)
                          }
                          loading={
                            resendUserInvite.isPending &&
                            resendUserInvite.variables?.uid === adminUser.uid
                          }
                        >
                          <Mail size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canResetPassword(role, adminUser.status) && (
                      <Tooltip content="パスワードリセット">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() =>
                            handleResetPassword(adminUser.uid, adminUser.email)
                          }
                          loading={
                            resetUserPassword.isPending &&
                            resetUserPassword.variables?.uid === adminUser.uid
                          }
                        >
                          <RotateCcwKey size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDeleteAdminUser(role) && (
                      <Tooltip content="削除">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          colorPalette="red"
                          onClick={() => {
                            setDeleteUid(adminUser.uid);
                            setDeleteEmail(adminUser.email);
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
          <Dialog.Content asChild>
            <styled.form onSubmit={handleEditRole}>
              <Dialog.Header>
                <Dialog.Title>ロール変更</Dialog.Title>
              </Dialog.Header>
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
          <Dialog.Content asChild>
            <styled.form onSubmit={handleEditDisplayName}>
              <Dialog.Header>
                <Dialog.Title>表示名変更</Dialog.Title>
              </Dialog.Header>
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
