import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import {
  AUTHORIZATION_PERMISSION_LABELS,
  AUTHORIZATION_PERMISSIONS,
  type AuthorizationPermission,
  normalizePermissions,
  PERMISSION_DEPENDENCIES,
  SYSTEM_ADMIN_ONLY_PERMISSION_SET,
} from "@mirai-yoho/shared/authorization-permission";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Checkbox from "@mirai-yoho/ui/components/ui/checkbox";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import {
  useConsoleRoles,
  useConsoleRolesQueryKey,
  useCreateConsoleRole,
  useDeleteConsoleRole,
  useUpdateConsoleRole,
} from "@/hooks/use-console-roles";

const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: AuthorizationPermission[];
}> = [
  {
    label: "ホーム・集計",
    permissions: ["console.dashboard.read"],
  },
  {
    label: "予約・決済",
    permissions: [
      "console.bookings.read",
      "console.bookings.cancel",
      "console.payments.read",
      "console.payments.charge",
    ],
  },
  {
    label: "顧客・占い師",
    permissions: [
      "console.customers.read",
      "console.consultants.read",
      "console.consultants.manage",
      "console.consultants.status.manage",
    ],
  },
  {
    label: "予約枠・設定",
    permissions: [
      "console.slots.read",
      "console.slots.manage",
      "console.settings.read",
      "console.settings.manage",
    ],
  },
  {
    label: "アカウント・ロール",
    permissions: [
      "console.accounts.read",
      "console.accounts.display-name.manage",
      "console.accounts.invite.resend",
      "console.accounts.password-reset",
      "console.accounts.delete",
      "console.roles.read",
    ],
  },
];

interface RoleFormState {
  roleId: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
}

const EMPTY_FORM: RoleFormState = {
  roleId: "",
  name: "",
  description: "",
  permissions: [],
};

function isPermissionRequired(
  permission: AuthorizationPermission,
  selected: AuthorizationPermission[],
): boolean {
  return selected.some((selectedPermission) =>
    (PERMISSION_DEPENDENCIES[selectedPermission] ?? []).includes(permission),
  );
}

export default function ConsoleRolesPage() {
  const { organizationId } = useOrganizationRouting();
  const resolvedOrganizationId = organizationId ?? "";
  const { roleId, hasPermission, refreshAuthContext } = useAuth();
  const { data, isLoading } = useConsoleRoles();
  const createRole = useCreateConsoleRole();
  const updateRole = useUpdateConsoleRole();
  const deleteRole = useDeleteConsoleRole();
  const queryClient = useQueryClient();
  const rolesQueryKey = useConsoleRolesQueryKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);

  const roles = data?.data?.roles ?? [];
  const editingRole = roles.find((item) => item.roleId === editRoleId) ?? null;
  const deletingRole =
    roles.find((item) => item.roleId === deleteRoleId) ?? null;

  if (!organizationId || !hasPermission("console.roles.read")) {
    return <Text>権限がありません</Text>;
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: rolesQueryKey });

  const resetForm = () => setForm(EMPTY_FORM);

  const togglePermission = (
    permission: AuthorizationPermission,
    checked: boolean,
  ) => {
    setForm((current) => {
      const nextPermissions = checked
        ? [...current.permissions, permission]
        : current.permissions.filter((item) => item !== permission);
      return {
        ...current,
        permissions: normalizePermissions(nextPermissions),
      };
    });
  };

  const openEdit = (targetRole: (typeof roles)[number]) => {
    setForm({
      roleId: targetRole.roleId,
      name: targetRole.name,
      description: targetRole.description,
      permissions: targetRole.permissions as AuthorizationPermission[],
    });
    setEditRoleId(targetRole.roleId);
  };

  const handleCreate = async () => {
    try {
      await createRole.mutateAsync({
        organizationId: resolvedOrganizationId,
        data: {
          roleId: form.roleId,
          name: form.name,
          description: form.description,
          permissions: form.permissions,
        },
      });
      toaster.success({ title: "成功", description: "ロールを作成しました" });
      setCreateOpen(false);
      resetForm();
      await invalidate();
      await refreshAuthContext();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleUpdate = async () => {
    if (!editRoleId) return;
    try {
      await updateRole.mutateAsync({
        organizationId: resolvedOrganizationId,
        roleId: editRoleId,
        data: {
          name: form.name,
          description: form.description,
          permissions: form.permissions,
        },
      });
      toaster.success({ title: "成功", description: "ロールを更新しました" });
      setEditRoleId(null);
      resetForm();
      await invalidate();
      await refreshAuthContext();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    try {
      await deleteRole.mutateAsync({
        organizationId: resolvedOrganizationId,
        roleId: deleteRoleId,
      });
      toaster.success({ title: "成功", description: "ロールを削除しました" });
      setDeleteRoleId(null);
      await invalidate();
      await refreshAuthContext();
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  const renderRoleForm = (mode: "create" | "edit") => (
    <styled.div display="flex" flexDir="column" gap="4">
      {mode === "create" && (
        <Field.Root>
          <Field.Label>ロールID</Field.Label>
          <Input
            value={form.roleId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                roleId: event.target.value,
              }))
            }
            placeholder="booking-manager"
          />
        </Field.Root>
      )}
      <Field.Root>
        <Field.Label>ロール名</Field.Label>
        <Input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>説明</Field.Label>
        <Textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </Field.Root>
      <styled.div display="grid" gap="4" gridTemplateColumns="repeat(2, 1fr)">
        {PERMISSION_GROUPS.map((group) => (
          <styled.div key={group.label} display="flex" flexDir="column" gap="2">
            <Text fontWeight="bold">{group.label}</Text>
            {group.permissions.map((permission) => {
              if (SYSTEM_ADMIN_ONLY_PERMISSION_SET.has(permission)) {
                return null;
              }
              const checked = form.permissions.includes(permission);
              const required = isPermissionRequired(
                permission,
                form.permissions,
              );
              return (
                <Checkbox.Root
                  key={permission}
                  checked={checked}
                  disabled={required}
                  onCheckedChange={(details) =>
                    togglePermission(permission, details.checked === true)
                  }
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>
                    {AUTHORIZATION_PERMISSION_LABELS[permission]}
                  </Checkbox.Label>
                  <Checkbox.HiddenInput />
                </Checkbox.Root>
              );
            })}
          </styled.div>
        ))}
      </styled.div>
    </styled.div>
  );

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
            権限管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            ロールごとの管理画面権限を設定します。
          </Text>
        </styled.div>
        {roleId === "admin" && (
          <Dialog.Root
            open={createOpen}
            onOpenChange={(event) => {
              setCreateOpen(event.open);
              if (!event.open) resetForm();
            }}
          >
            <Dialog.Trigger asChild>
              <Button>ロール作成</Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>ロール作成</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>{renderRoleForm("create")}</Dialog.Body>
                <Dialog.Footer>
                  <Dialog.CloseTrigger asChild>
                    <Button variant="outline">キャンセル</Button>
                  </Dialog.CloseTrigger>
                  <Button
                    onClick={handleCreate}
                    loading={createRole.isPending}
                    loadingText="作成中..."
                  >
                    作成する
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        )}
      </styled.div>

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          message="ロールはありません"
          hint="組織ロールの初期化を確認してください"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>ロール</Table.Header>
              <Table.Header>説明</Table.Header>
              <Table.Header>権限数</Table.Header>
              <Table.Header>割当</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {roles.map((item) => (
              <Table.Row key={item.roleId}>
                <Table.Cell>
                  <styled.div display="flex" alignItems="center" gap="2">
                    <Text fontWeight="bold">{item.name}</Text>
                    {item.isSystem && (
                      <Badge variant="subtle" size="sm" colorPalette="blue">
                        デフォルトロール
                      </Badge>
                    )}
                  </styled.div>
                  <Text textStyle="xs" color="fg.muted">
                    {item.roleId}
                  </Text>
                </Table.Cell>
                <Table.Cell>{item.description || "-"}</Table.Cell>
                <Table.Cell>
                  {item.permissions.length} / {AUTHORIZATION_PERMISSIONS.length}
                </Table.Cell>
                <Table.Cell>{item.assignedCount}</Table.Cell>
                <Table.Cell>
                  {roleId === "admin" && (
                    <styled.div display="flex" gap="1">
                      {!item.isSystem && (
                        <Tooltip content="編集">
                          <IconButton
                            variant="subtle"
                            size="sm"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!item.isSystem && item.assignedCount === 0 && (
                        <Tooltip content="削除">
                          <IconButton
                            variant="subtle"
                            size="sm"
                            colorPalette="red"
                            onClick={() => setDeleteRoleId(item.roleId)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </styled.div>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root
        open={!!editingRole}
        onOpenChange={(event) => {
          if (!event.open) {
            setEditRoleId(null);
            resetForm();
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>ロール編集</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{renderRoleForm("edit")}</Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                onClick={handleUpdate}
                loading={updateRole.isPending}
                loadingText="更新中..."
              >
                更新する
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={!!deletingRole}
        onOpenChange={(event) => {
          if (!event.open) setDeleteRoleId(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>ロール削除</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>{deletingRole?.name} を削除しますか？</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette="red"
                onClick={handleDelete}
                loading={deleteRole.isPending}
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
