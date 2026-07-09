import { createListCollection } from "@ark-ui/react/select";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useListQueryParams } from "@mirai-yoho/console-core/hooks/use-list-query-params";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { ListControls } from "@mirai-yoho/ui/components/list-controls";
import { AccountStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Select from "@mirai-yoho/ui/components/ui/select";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import {
  Contact,
  Mail,
  RotateCcwKey,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  useAdminAccounts,
  useAdminAccountsQueryKey,
  useDeleteAdminAccount,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
} from "@/hooks/use-admin-accounts";
import { useAdminRoles, useAdminRolesQueryKey } from "@/hooks/use-admin-roles";
import {
  type AccountEditDisplayNameFormValues,
  accountEditDisplayNameFormSchema,
} from "./account-edit-display-name-form-schema";
import {
  type AccountEditRoleFormValues,
  accountEditRoleFormSchema,
} from "./account-edit-role-form-schema";
import {
  type AccountInviteFormValues,
  accountInviteFormSchema,
} from "./account-invite-form-schema";
import {
  canDeleteAdminAccount,
  canEditDisplayName,
  canResendInvite,
  canResetPassword,
} from "./account-permissions";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  operator: "オペレーター",
  consultant: "相談員",
};

export default function AdminAccountsPage() {
  const { organizationId } = useOrganizationRouting();
  const resolvedOrganizationId = organizationId ?? "";
  const { role, user, hasPermission, refreshAuthContext } = useAuth();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data, isLoading } = useAdminAccounts({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const { data: roleData } = useAdminRoles();
  const queryKey = useAdminAccountsQueryKey();
  const rolesQueryKey = useAdminRolesQueryKey();
  const queryCustomer = useQueryClient();
  const roles = roleData?.data?.roles ?? [];
  const roleCollection = createListCollection({
    items: roles.map((item) => ({
      label: item.name,
      value: item.roleId,
    })),
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    setValue: setInviteValue,
    watch: watchInvite,
    reset: resetInviteForm,
    formState: { errors: inviteErrors },
  } = useForm<AccountInviteFormValues>({
    resolver: valibotResolver(accountInviteFormSchema),
    defaultValues: {
      email: "",
      name: "",
      role: roles.find((item) => item.roleId !== "admin")?.roleId ?? "operator",
    },
  });
  const inviteRole = watchInvite("role");
  const inviteAccount = useInviteAccount();

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleUid, setEditRoleUid] = useState("");
  const {
    handleSubmit: handleEditRoleSubmit,
    setValue: setEditRoleValue,
    watch: watchEditRole,
    reset: resetEditRoleForm,
  } = useForm<AccountEditRoleFormValues>({
    resolver: valibotResolver(accountEditRoleFormSchema),
    defaultValues: {
      role: "operator",
    },
  });
  const editRoleValue = watchEditRole("role");
  const updateAccountRole = useUpdateAccountRole();
  const [editDisplayNameOpen, setEditDisplayNameOpen] = useState(false);
  const [editDisplayNameUid, setEditDisplayNameUid] = useState("");
  const {
    register: registerEditDisplayName,
    handleSubmit: handleEditDisplayNameSubmit,
    reset: resetEditDisplayNameForm,
    formState: { errors: editDisplayNameErrors },
  } = useForm<AccountEditDisplayNameFormValues>({
    resolver: valibotResolver(accountEditDisplayNameFormSchema),
    defaultValues: {
      name: "",
    },
  });
  const updateAccountDisplayName = useUpdateAccountDisplayName();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUid, setDeleteUid] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const deleteAdminAccount = useDeleteAdminAccount();

  const resendAccountInvite = useResendAccountInvite();
  const resetAccountPassword = useResetAccountPassword();

  const accounts = (data?.data?.accounts ?? []).filter(
    (account) => account.role !== "consultant",
  );
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: accounts.length,
    totalPages: 1,
  };
  const currentUid = user?.uid;

  if (!organizationId || !hasPermission("admin.accounts.read")) {
    return <Text>権限がありません</Text>;
  }

  const invalidate = async () => {
    await Promise.all([
      queryCustomer.invalidateQueries({ queryKey }),
      queryCustomer.invalidateQueries({ queryKey: rolesQueryKey }),
    ]);
  };

  const onInvite = async (values: AccountInviteFormValues) => {
    try {
      await inviteAccount.mutateAsync({
        organizationId: resolvedOrganizationId,
        data: {
          email: values.email,
          name: values.name,
          role: values.role,
        },
      });
      toaster.success({
        title: "成功",
        description: `${values.email} に招待メールを送信しました`,
      });
      resetInviteForm();
      setInviteOpen(false);
      await invalidate();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const onEditRole = async (values: AccountEditRoleFormValues) => {
    try {
      await updateAccountRole.mutateAsync({
        organizationId: resolvedOrganizationId,
        uid: editRoleUid,
        data: { role: values.role },
      });
      toaster.success({
        title: "成功",
        description: `ロールを ${ROLE_LABELS[values.role] ?? values.role} に変更しました`,
      });
      setEditRoleOpen(false);
      await invalidate();
      await refreshAuthContext();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const onEditDisplayName = async (
    values: AccountEditDisplayNameFormValues,
  ) => {
    try {
      await updateAccountDisplayName.mutateAsync({
        organizationId: resolvedOrganizationId,
        uid: editDisplayNameUid,
        data: { name: values.name },
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
      await resendAccountInvite.mutateAsync({
        organizationId: resolvedOrganizationId,
        uid,
      });
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
      await resetAccountPassword.mutateAsync({
        organizationId: resolvedOrganizationId,
        uid,
      });
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
      await deleteAdminAccount.mutateAsync({
        organizationId: resolvedOrganizationId,
        uid: deleteUid,
      });
      toaster.success({
        title: "成功",
        description: `${deleteEmail} を削除しました`,
      });
      setDeleteOpen(false);
      await invalidate();
      await refreshAuthContext();
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
            アカウント管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            管理者とオペレーターの招待・アカウント管理を行う画面です。
          </Text>
        </styled.div>

        {role === "admin" && (
          <Dialog.Root
            open={inviteOpen}
            onOpenChange={(e) => {
              setInviteOpen(e.open);
              if (!e.open) {
                resetInviteForm();
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button>
                <UserPlus size={16} />
                アカウント招待
              </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content asChild>
                <styled.form onSubmit={handleInviteSubmit(onInvite)}>
                  <Dialog.Header>
                    <Dialog.Title>アカウント招待</Dialog.Title>
                    <Dialog.Description>
                      メールアドレス・表示名・ロールを入力してください
                    </Dialog.Description>
                  </Dialog.Header>
                  <Dialog.Body display="flex" flexDir="column" gap="4">
                    <Field.Root invalid={!!inviteErrors.email}>
                      <Field.Label>メールアドレス</Field.Label>
                      <Input type="email" {...registerInvite("email")} />
                      {inviteErrors.email && (
                        <Field.ErrorText>
                          {inviteErrors.email.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                    <Field.Root invalid={!!inviteErrors.name}>
                      <Field.Label>表示名</Field.Label>
                      <Input {...registerInvite("name")} />
                      {inviteErrors.name && (
                        <Field.ErrorText>
                          {inviteErrors.name.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                    <Select.Root
                      collection={roleCollection}
                      value={[inviteRole]}
                      onValueChange={(details) =>
                        setInviteValue(
                          "role",
                          details.value[0] as AccountInviteFormValues["role"],
                        )
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
                          {roleCollection.items.map((item) => (
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
                      loading={inviteAccount.isPending}
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
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Users}
          message="アカウントはありません"
          hint="アカウント招待ボタンから招待できます"
        />
      ) : (
        <>
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
              {accounts.map((adminUser) => (
                <Table.Row
                  key={adminUser.uid}
                  bg={currentUid === adminUser.uid ? "blue.2" : undefined}
                >
                  <Table.Cell>{adminUser.email}</Table.Cell>
                  <Table.Cell>
                    <styled.div
                      display="inline-flex"
                      alignItems="center"
                      gap="2"
                    >
                      <Text as="span">
                        {adminUser.name || adminUser.email || "-"}
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
                            aria-label="現在ログイン中のアカウント"
                          >
                            あなた
                          </Badge>
                        </styled.div>
                      )}
                    </styled.div>
                  </Table.Cell>
                  <Table.Cell>
                    {adminUser.roleName ??
                      ROLE_LABELS[adminUser.role] ??
                      adminUser.role}
                  </Table.Cell>
                  <Table.Cell>
                    <AccountStatusBadge status={adminUser.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <styled.div display="flex" gap="1">
                      {hasPermission("admin.accounts.display-name.manage") &&
                        canEditDisplayName(role, user?.uid, adminUser.uid) && (
                          <Tooltip content="表示名変更">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() => {
                                setEditDisplayNameUid(adminUser.uid);
                                resetEditDisplayNameForm({
                                  name: adminUser.name || adminUser.email || "",
                                });
                                setEditDisplayNameOpen(true);
                              }}
                            >
                              <Contact size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {role === "admin" && adminUser.status !== "pending" && (
                        <Tooltip content="ロール変更">
                          <IconButton
                            variant="subtle"
                            size="sm"
                            onClick={() => {
                              setEditRoleUid(adminUser.uid);
                              setEditRoleValue(
                                "role",
                                adminUser.role as AccountEditRoleFormValues["role"],
                              );
                              setEditRoleOpen(true);
                            }}
                          >
                            <ShieldAlert size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {hasPermission("admin.accounts.invite.resend") &&
                        canResendInvite(role, adminUser.status) && (
                          <Tooltip content="招待メール再送">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() =>
                                handleResendInvite(
                                  adminUser.uid,
                                  adminUser.email,
                                )
                              }
                              loading={
                                resendAccountInvite.isPending &&
                                resendAccountInvite.variables?.uid ===
                                  adminUser.uid
                              }
                            >
                              <Mail size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {hasPermission("admin.accounts.password-reset") &&
                        canResetPassword(role, adminUser.status) && (
                          <Tooltip content="パスワードリセット">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() =>
                                handleResetPassword(
                                  adminUser.uid,
                                  adminUser.email,
                                )
                              }
                              loading={
                                resetAccountPassword.isPending &&
                                resetAccountPassword.variables?.uid ===
                                  adminUser.uid
                              }
                            >
                              <RotateCcwKey size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {hasPermission("admin.accounts.delete") &&
                        canDeleteAdminAccount(role) && (
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

      {/* ロール編集ダイアログ */}
      <Dialog.Root
        open={editRoleOpen}
        onOpenChange={(e) => {
          setEditRoleOpen(e.open);
          if (!e.open) {
            resetEditRoleForm({ role: "operator" });
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            <styled.form onSubmit={handleEditRoleSubmit(onEditRole)}>
              <Dialog.Header>
                <Dialog.Title>ロール変更</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Select.Root
                  collection={roleCollection}
                  value={[editRoleValue]}
                  onValueChange={(details) =>
                    setEditRoleValue(
                      "role",
                      details.value[0] as AccountEditRoleFormValues["role"],
                    )
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
                      {roleCollection.items.map((item) => (
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
                  loading={updateAccountRole.isPending}
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
        onOpenChange={(e) => {
          setEditDisplayNameOpen(e.open);
          if (!e.open) {
            resetEditDisplayNameForm();
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            <styled.form
              onSubmit={handleEditDisplayNameSubmit(onEditDisplayName)}
            >
              <Dialog.Header>
                <Dialog.Title>表示名変更</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Field.Root invalid={!!editDisplayNameErrors.name}>
                  <Field.Label>表示名</Field.Label>
                  <Input {...registerEditDisplayName("name")} />
                  {editDisplayNameErrors.name && (
                    <Field.ErrorText>
                      {editDisplayNameErrors.name.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button variant="outline">キャンセル</Button>
                </Dialog.CloseTrigger>
                <Button
                  type="submit"
                  loading={updateAccountDisplayName.isPending}
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
              <Dialog.Title>アカウント削除</Dialog.Title>
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
                loading={deleteAdminAccount.isPending}
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
