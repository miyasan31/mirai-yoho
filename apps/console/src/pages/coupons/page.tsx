import { valibotResolver } from "@hookform/resolvers/valibot";
import { getGetConsoleCouponsQueryKey } from "@mirai-yoho/api-client/api/console/console";
import type { Coupon, CouponType } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import {
  applyOptimistic,
  rollbackOptimistic,
} from "@mirai-yoho/console-core/query/optimistic-updates";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, TicketPercent } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import {
  useArchiveConsoleCoupon,
  useConsoleCoupons,
  useCreateConsoleCoupon,
  useUpdateConsoleCoupon,
} from "@/hooks/use-console-coupons";
import {
  type CouponCreateFormValues,
  type CouponUpdateFormValues,
  couponCreateFormSchema,
  couponUpdateFormSchema,
} from "./coupon-form-schema";

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  welcome: "初回登録特典",
  birthday: "誕生月",
};

const COUPON_TYPE_COLOR: Record<CouponType, "green" | "purple"> = {
  welcome: "green",
  birthday: "purple",
};

type CouponsListCache = {
  data: { coupons: Coupon[] };
  status: number;
  headers: unknown;
};

export default function ConsoleCouponsPage() {
  const { organizationId } = useOrganizationRouting();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useConsoleCoupons();

  const createMutation = useCreateConsoleCoupon();
  const updateMutation = useUpdateConsoleCoupon();
  const archiveMutation = useArchiveConsoleCoupon();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Coupon | null>(null);

  const canManage = hasPermission("console.coupons.manage");

  const invalidate = async () => {
    if (!organizationId) return;
    await invalidateAfter.couponMutation(queryClient, organizationId);
  };

  const createForm = useForm<CouponCreateFormValues>({
    resolver: valibotResolver(couponCreateFormSchema),
    defaultValues: {
      type: "welcome",
      name: "",
      amountJPY: 1000,
      batchSize: 10,
      expiresInDays: 90,
    },
  });

  const editForm = useForm<CouponUpdateFormValues>({
    resolver: valibotResolver(couponUpdateFormSchema),
    defaultValues: {
      name: "",
      amountJPY: 0,
      batchSize: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        name: editing.name,
        amountJPY: editing.amountJPY,
        batchSize: editing.batchSize,
      });
    }
  }, [editing, editForm]);

  const onCreate = async (values: CouponCreateFormValues) => {
    if (!organizationId) return;
    try {
      await createMutation.mutateAsync({
        organizationId,
        data: {
          type: values.type,
          name: values.name,
          amountJPY: values.amountJPY,
          batchSize: values.batchSize,
          expiresInDays: values.expiresInDays,
        },
      });
      toaster.success({ title: "クーポンを作成しました" });
      createForm.reset();
      setCreateOpen(false);
      await invalidate();
    } catch {
      // custom-fetch がエラー Toast 表示
    }
  };

  const onUpdate = async (values: CouponUpdateFormValues) => {
    if (!organizationId || !editing) return;
    try {
      await updateMutation.mutateAsync({
        organizationId,
        couponId: editing.couponId,
        data: values,
      });
      toaster.success({ title: "クーポンを更新しました" });
      setEditing(null);
      await invalidate();
    } catch {
      // handled globally
    }
  };

  const onArchive = async () => {
    if (!organizationId || !archiveTarget) return;
    const queryKey = getGetConsoleCouponsQueryKey(organizationId);
    const targetCouponId = archiveTarget.couponId;
    const snapshot = await applyOptimistic<CouponsListCache>(
      queryClient,
      queryKey,
      (prev) => ({
        ...prev,
        data: {
          ...prev.data,
          coupons: prev.data.coupons.map((coupon) =>
            coupon.couponId === targetCouponId
              ? {
                  ...coupon,
                  isArchived: true,
                  isActive: false,
                  archivedAt: new Date().toISOString(),
                }
              : coupon,
          ),
        },
      }),
    );
    try {
      await archiveMutation.mutateAsync({
        organizationId,
        couponId: targetCouponId,
      });
      toaster.success({ title: "クーポンを無効化しました" });
      setArchiveTarget(null);
    } catch {
      rollbackOptimistic(queryClient, queryKey, snapshot);
    } finally {
      await invalidate();
    }
  };

  const coupons = data?.data?.coupons ?? [];

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
            クーポン管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            初回登録特典・誕生月クーポンのマスターを管理します。顧客はマイページから自分で取得します。
          </Text>
        </styled.div>
        {canManage && (
          <Button
            onClick={() => {
              createForm.reset({
                type: "welcome",
                name: "",
                amountJPY: 1000,
                batchSize: 10,
                expiresInDays: 90,
              });
              setCreateOpen(true);
            }}
          >
            <Plus size={16} />
            新規作成
          </Button>
        )}
      </styled.div>
      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          message="クーポンはありません"
          hint={
            canManage
              ? "新規作成ボタンからクーポンを追加できます"
              : "管理者にクーポン作成を依頼してください"
          }
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>種別</Table.Header>
              <Table.Header>名称</Table.Header>
              <Table.Header>割引額</Table.Header>
              <Table.Header>枚数</Table.Header>
              <Table.Header>有効日数</Table.Header>
              <Table.Header>状態</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {coupons.map((coupon) => (
              <Table.Row key={coupon.couponId}>
                <Table.Cell>
                  <Badge colorPalette={COUPON_TYPE_COLOR[coupon.type]}>
                    {COUPON_TYPE_LABEL[coupon.type]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{coupon.name}</Table.Cell>
                <Table.Cell>¥{coupon.amountJPY.toLocaleString()}</Table.Cell>
                <Table.Cell>{coupon.batchSize} 枚/回</Table.Cell>
                <Table.Cell>{coupon.expiresInDays}日</Table.Cell>
                <Table.Cell>
                  {coupon.isArchived ? (
                    <Badge variant="subtle">無効</Badge>
                  ) : (
                    <Badge colorPalette="green">有効</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {canManage && !coupon.isArchived && (
                    <styled.div display="flex" gap="1">
                      <Tooltip content="編集">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => setEditing(coupon)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="無効化">
                        <IconButton
                          variant="subtle"
                          size="sm"
                          onClick={() => setArchiveTarget(coupon)}
                        >
                          <Archive size={16} />
                        </IconButton>
                      </Tooltip>
                    </styled.div>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root
        open={createOpen}
        onOpenChange={(details) => {
          setCreateOpen(details.open);
          if (!details.open) createForm.reset();
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            <styled.form onSubmit={createForm.handleSubmit(onCreate)}>
              <Dialog.Header>
                <Dialog.Title>クーポン作成</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body display="flex" flexDir="column" gap="4">
                <Field.Root invalid={!!createForm.formState.errors.type}>
                  <Field.Label>種別</Field.Label>
                  <styled.select
                    {...createForm.register("type")}
                    rounded="l2"
                    p="2"
                    borderWidth="1"
                    borderColor="border"
                  >
                    <option value="welcome">初回登録特典</option>
                    <option value="birthday">誕生月</option>
                  </styled.select>
                  {createForm.formState.errors.type && (
                    <Field.ErrorText>
                      {createForm.formState.errors.type.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root invalid={!!createForm.formState.errors.name}>
                  <Field.Label>名称</Field.Label>
                  <Input {...createForm.register("name")} />
                  {createForm.formState.errors.name && (
                    <Field.ErrorText>
                      {createForm.formState.errors.name.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root invalid={!!createForm.formState.errors.amountJPY}>
                  <Field.Label>割引額（円）</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...createForm.register("amountJPY", {
                      valueAsNumber: true,
                    })}
                  />
                  {createForm.formState.errors.amountJPY && (
                    <Field.ErrorText>
                      {createForm.formState.errors.amountJPY.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root invalid={!!createForm.formState.errors.batchSize}>
                  <Field.Label>1 度の取得で配る枚数</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...createForm.register("batchSize", {
                      valueAsNumber: true,
                    })}
                  />
                  {createForm.formState.errors.batchSize && (
                    <Field.ErrorText>
                      {createForm.formState.errors.batchSize.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root
                  invalid={!!createForm.formState.errors.expiresInDays}
                >
                  <Field.Label>有効日数（受け取り日から）</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...createForm.register("expiresInDays", {
                      valueAsNumber: true,
                    })}
                  />
                  {createForm.formState.errors.expiresInDays && (
                    <Field.ErrorText>
                      {createForm.formState.errors.expiresInDays.message}
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
                  loading={createMutation.isPending}
                  loadingText="作成中..."
                >
                  作成
                </Button>
              </Dialog.Footer>
            </styled.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={!!editing}
        onOpenChange={(details) => {
          if (!details.open) setEditing(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content asChild>
            <styled.form onSubmit={editForm.handleSubmit(onUpdate)}>
              <Dialog.Header>
                <Dialog.Title>クーポン編集</Dialog.Title>
                {editing && (
                  <Dialog.Description>
                    種別: {COUPON_TYPE_LABEL[editing.type]}（変更不可）
                  </Dialog.Description>
                )}
              </Dialog.Header>
              <Dialog.Body display="flex" flexDir="column" gap="4">
                <Field.Root invalid={!!editForm.formState.errors.name}>
                  <Field.Label>名称</Field.Label>
                  <Input {...editForm.register("name")} />
                  {editForm.formState.errors.name && (
                    <Field.ErrorText>
                      {editForm.formState.errors.name.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root invalid={!!editForm.formState.errors.amountJPY}>
                  <Field.Label>割引額（円）</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...editForm.register("amountJPY", {
                      valueAsNumber: true,
                    })}
                  />
                  {editForm.formState.errors.amountJPY && (
                    <Field.ErrorText>
                      {editForm.formState.errors.amountJPY.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                <Field.Root invalid={!!editForm.formState.errors.batchSize}>
                  <Field.Label>1 度の取得で配る枚数</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...editForm.register("batchSize", {
                      valueAsNumber: true,
                    })}
                  />
                  {editForm.formState.errors.batchSize && (
                    <Field.ErrorText>
                      {editForm.formState.errors.batchSize.message}
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
                  loading={updateMutation.isPending}
                  loadingText="更新中..."
                >
                  更新
                </Button>
              </Dialog.Footer>
            </styled.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={!!archiveTarget}
        onOpenChange={(details) => {
          if (!details.open) setArchiveTarget(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>クーポンを無効化</Dialog.Title>
              <Dialog.Description>
                「{archiveTarget?.name}
                」を無効化します。既に配布済みの UserCoupon には影響しません。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette="red"
                loading={archiveMutation.isPending}
                loadingText="実行中..."
                onClick={onArchive}
              >
                無効化する
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </styled.div>
  );
}
