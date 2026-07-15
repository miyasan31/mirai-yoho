import { createListCollection } from "@ark-ui/react/select";
import { valibotResolver } from "@hookform/resolvers/valibot";
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
import { useAuth } from "@/hooks/use-auth";
import {
  useConsoleAccounts,
  useConsoleAccountsQueryKey,
  useDeleteConsoleAccount,
  useInviteAccount,
  useResendAccountInvite,
  useResetAccountPassword,
  useUpdateAccountDisplayName,
  useUpdateAccountRole,
} from "@/hooks/use-console-accounts";
import {
  useConsoleRoles,
  useConsoleRolesQueryKey,
} from "@/hooks/use-console-roles";
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
  canDeleteConsoleAccount,
  canEditDisplayName,
  canResendInvite,
  canResetPassword,
} from "./account-permissions";

export default function ConsoleAccountsPage() {
  const { organizationId } = useOrganizationRouting();
  const resolvedOrganizationId = organizationId ?? "";
  const { roleId, user, hasPermission, refreshAuthContext } = useAuth();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data, isLoading } = useConsoleAccounts({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const { data: roleData } = useConsoleRoles();
  const queryKey = useConsoleAccountsQueryKey();
  const rolesQueryKey = useConsoleRolesQueryKey();
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
      roleId:
        roles.find((item) => item.roleId !== "admin")?.roleId ?? "operator",
    },
  });
  const inviteRoleId = watchInvite("roleId");
  const inviteAccount = useInviteAccount();

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleAccountId, setEditRoleAccountId] = useState<string>("");
  const {
    handleSubmit: handleEditRoleSubmit,
    setValue: setEditRoleValue,
    watch: watchEditRole,
    reset: resetEditRoleForm,
  } = useForm<AccountEditRoleFormValues>({
    resolver: valibotResolver(accountEditRoleFormSchema),
    defaultValues: {
      roleId: "operator",
    },
  });
  const editRoleValue = watchEditRole("roleId");
  const updateAccountRole = useUpdateAccountRole();
  const [editDisplayNameOpen, setEditDisplayNameOpen] = useState(false);
  const [editDisplayNameAccountId, setEditDisplayNameAccountId] =
    useState<string>("");
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
  const [deleteAccountId, setDeleteAccountId] = useState<string>("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const deleteConsoleAccount = useDeleteConsoleAccount();

  const resendAccountInvite = useResendAccountInvite();
  const resetAccountPassword = useResetAccountPassword();

  const accounts = data?.data?.accounts ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: accounts.length,
    totalPages: 1,
  };
  const currentAccountId = user?.uid;
  const roleNameById = new Map(
    roles.map((role) => [role.roleId, role.name] as const),
  );

  if (!organizationId || !hasPermission("console.accounts.read")) {
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
          roleId: values.roleId,
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
        accountId: editRoleAccountId,
        data: { roleId: values.roleId },
      });
      toaster.success({
        title: "成功",
        description: `ロールを ${roleNameById.get(values.roleId) ?? values.roleId} に変更しました`,
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
        accountId: editDisplayNameAccountId,
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

  const handleResendInvite = async (accountId: string, email: string) => {
    try {
      await resendAccountInvite.mutateAsync({
        organizationId: resolvedOrganizationId,
        accountId,
      });
      toaster.success({
        title: "成功",
        description: `${email} に招待メールを再送しました`,
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleResetPassword = async (accountId: string, email: string) => {
    try {
      await resetAccountPassword.mutateAsync({
        organizationId: resolvedOrganizationId,
        accountId,
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
      await deleteConsoleAccount.mutateAsync({
        organizationId: resolvedOrganizationId,
        accountId: deleteAccountId,
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

        {roleId === "admin" && (
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
                      value={[inviteRoleId]}
                      onValueChange={(details) =>
                        setInviteValue(
                          "roleId",
                          details.value[0] as AccountInviteFormValues["roleId"],
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
              {accounts.map((consoleUser) => (
                <Table.Row
                  key={consoleUser.accountId}
                  bg={
                    currentAccountId === consoleUser.accountId
                      ? "blue.2"
                      : undefined
                  }
                >
                  <Table.Cell>{consoleUser.email}</Table.Cell>
                  <Table.Cell>
                    <styled.div
                      display="inline-flex"
                      alignItems="center"
                      gap="2"
                    >
                      <Text as="span">
                        {consoleUser.name || consoleUser.email || "-"}
                      </Text>
                      {currentAccountId === consoleUser.accountId && (
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
                    {consoleUser.roleName ?? consoleUser.roleId}
                  </Table.Cell>
                  <Table.Cell>
                    <AccountStatusBadge status={consoleUser.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <styled.div display="flex" gap="1">
                      {hasPermission("console.accounts.display-name.manage") &&
                        canEditDisplayName(
                          roleId,
                          user?.uid,
                          consoleUser.accountId,
                        ) && (
                          <Tooltip content="表示名変更">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() => {
                                setEditDisplayNameAccountId(
                                  consoleUser.accountId,
                                );
                                resetEditDisplayNameForm({
                                  name:
                                    consoleUser.name || consoleUser.email || "",
                                });
                                setEditDisplayNameOpen(true);
                              }}
                            >
                              <Contact size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {roleId === "admin" &&
                        consoleUser.status === "active" && (
                          <Tooltip content="ロール変更">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() => {
                                setEditRoleAccountId(consoleUser.accountId);
                                setEditRoleValue(
                                  "roleId",
                                  consoleUser.roleId as AccountEditRoleFormValues["roleId"],
                                );
                                setEditRoleOpen(true);
                              }}
                            >
                              <ShieldAlert size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {hasPermission("console.accounts.invite.resend") &&
                        canResendInvite(roleId, consoleUser.status) && (
                          <Tooltip content="招待メール再送">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() =>
                                handleResendInvite(
                                  consoleUser.accountId,
                                  consoleUser.email,
                                )
                              }
                              loading={
                                resendAccountInvite.isPending &&
                                resendAccountInvite.variables?.accountId ===
                                  consoleUser.accountId
                              }
                            >
                              <Mail size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {hasPermission("console.accounts.password-reset") &&
                        canResetPassword(roleId, consoleUser.status) && (
                          <Tooltip content="パスワードリセット">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              onClick={() =>
                                handleResetPassword(
                                  consoleUser.accountId,
                                  consoleUser.email,
                                )
                              }
                              loading={
                                resetAccountPassword.isPending &&
                                resetAccountPassword.variables?.accountId ===
                                  consoleUser.accountId
                              }
                            >
                              <RotateCcwKey size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      {hasPermission("console.accounts.delete") &&
                        canDeleteConsoleAccount(roleId) && (
                          <Tooltip content="削除">
                            <IconButton
                              variant="subtle"
                              size="sm"
                              colorPalette="red"
                              onClick={() => {
                                setDeleteAccountId(consoleUser.accountId);
                                setDeleteEmail(consoleUser.email);
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
            resetEditRoleForm({ roleId: "operator" });
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
                      "roleId",
                      details.value[0] as AccountEditRoleFormValues["roleId"],
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
                loading={deleteConsoleAccount.isPending}
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
