import { valibotResolver } from "@hookform/resolvers/valibot";
import { getGetConsoleCouponsQueryKey } from "@mirai-yoho/api-client/api/console/console";
import type { Coupon, CouponType } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
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
import { Archive, Pencil, Plus, Send, TicketPercent } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import {
  useArchiveConsoleCoupon,
  useConsoleCoupons,
  useCreateConsoleCoupon,
  useDistributeConsoleCoupon,
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
  general: "汎用",
};

const COUPON_TYPE_COLOR: Record<CouponType, "green" | "purple" | "blue"> = {
  welcome: "green",
  birthday: "purple",
  general: "blue",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ja-JP");
}

export default function ConsoleCouponsPage() {
  const { organizationId } = useOrganizationRouting();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useConsoleCoupons();

  const createMutation = useCreateConsoleCoupon();
  const updateMutation = useUpdateConsoleCoupon();
  const archiveMutation = useArchiveConsoleCoupon();
  const distributeMutation = useDistributeConsoleCoupon();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Coupon | null>(null);
  const [distributeTarget, setDistributeTarget] = useState<Coupon | null>(null);

  const canManage = hasPermission("console.coupons.manage");

  const invalidate = async () => {
    if (!organizationId) return;
    await queryClient.invalidateQueries({
      queryKey: getGetConsoleCouponsQueryKey(organizationId),
    });
  };

  const createForm = useForm<CouponCreateFormValues>({
    resolver: valibotResolver(couponCreateFormSchema),
    defaultValues: {
      type: "general",
      name: "",
      amountJPY: 1000,
      distributionCount: 1,
    },
  });

  const editForm = useForm<CouponUpdateFormValues>({
    resolver: valibotResolver(couponUpdateFormSchema),
    defaultValues: {
      name: "",
      amountJPY: 0,
      distributionCount: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        name: editing.name,
        amountJPY: editing.amountJPY,
        distributionCount: editing.distributionCount,
      });
    }
  }, [editing, editForm]);

  const selectedType = createForm.watch("type");

  const onCreate = async (values: CouponCreateFormValues) => {
    if (!organizationId) return;
    try {
      await createMutation.mutateAsync({
        organizationId,
        data: {
          type: values.type,
          name: values.name,
          amountJPY: values.amountJPY,
          distributionCount: values.distributionCount,
          startsAt:
            values.type === "general" && values.startsAt
              ? new Date(values.startsAt).toISOString()
              : undefined,
          expiresInDays:
            values.type === "welcome" || values.type === "birthday"
              ? values.expiresInDays
              : undefined,
          expiresAt:
            values.type === "general" && values.expiresAt
              ? new Date(values.expiresAt).toISOString()
              : undefined,
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
    try {
      await archiveMutation.mutateAsync({
        organizationId,
        couponId: archiveTarget.couponId,
      });
      toaster.success({ title: "クーポンを無効化しました" });
      setArchiveTarget(null);
      await invalidate();
    } catch {
      // handled globally
    }
  };

  const onDistribute = async () => {
    if (!organizationId || !distributeTarget) return;
    try {
      const result = await distributeMutation.mutateAsync({
        organizationId,
        couponId: distributeTarget.couponId,
      });
      toaster.success({
        title: `${result.data.issuedCount} 名に配布しました`,
        description:
          result.data.skippedCount > 0
            ? `${result.data.skippedCount} 名は受け取り済みのためスキップ`
            : undefined,
      });
      setDistributeTarget(null);
      await invalidate();
    } catch {
      // handled globally
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
            初回登録特典・誕生月・汎用クーポンのマスターを管理します。
          </Text>
        </styled.div>
        {canManage && (
          <Button
            onClick={() => {
              createForm.reset({
                type: "general",
                name: "",
                amountJPY: 1000,
                distributionCount: 1,
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
              <Table.Header>期限</Table.Header>
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
                <Table.Cell>{coupon.distributionCount}</Table.Cell>
                <Table.Cell>
                  {coupon.type === "general"
                    ? `${formatDate(coupon.startsAt ?? null)} 〜 ${formatDate(coupon.expiresAt ?? null)}`
                    : `${coupon.expiresInDays ?? "-"}日`}
                </Table.Cell>
                <Table.Cell>
                  {coupon.isArchived ? (
                    <Badge variant="subtle">無効</Badge>
                  ) : coupon.isActive ? (
                    <Badge colorPalette="green">有効</Badge>
                  ) : (
                    <Badge colorPalette="gray">期間外</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {canManage && !coupon.isArchived && (
                    <styled.div display="flex" gap="1">
                      {coupon.type === "general" && coupon.isActive && (
                        <Tooltip content="全顧客に配布">
                          <IconButton
                            variant="subtle"
                            size="sm"
                            onClick={() => setDistributeTarget(coupon)}
                          >
                            <Send size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
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
                    <option value="general">汎用</option>
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
                <Field.Root
                  invalid={!!createForm.formState.errors.distributionCount}
                >
                  <Field.Label>
                    {selectedType === "welcome"
                      ? "1ユーザーに配る枚数"
                      : "配布上限（枚）"}
                  </Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...createForm.register("distributionCount", {
                      valueAsNumber: true,
                    })}
                  />
                  {createForm.formState.errors.distributionCount && (
                    <Field.ErrorText>
                      {createForm.formState.errors.distributionCount.message}
                    </Field.ErrorText>
                  )}
                </Field.Root>
                {(selectedType === "welcome" ||
                  selectedType === "birthday") && (
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
                )}
                {selectedType === "general" && (
                  <>
                    <Field.Root>
                      <Field.Label>開始日時（省略可）</Field.Label>
                      <Input
                        type="datetime-local"
                        {...createForm.register("startsAt")}
                      />
                    </Field.Root>
                    <Field.Root
                      invalid={!!createForm.formState.errors.expiresAt}
                    >
                      <Field.Label>有効期限日時</Field.Label>
                      <Input
                        type="datetime-local"
                        {...createForm.register("expiresAt")}
                      />
                      {createForm.formState.errors.expiresAt && (
                        <Field.ErrorText>
                          {createForm.formState.errors.expiresAt.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                  </>
                )}
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
                <Field.Root
                  invalid={!!editForm.formState.errors.distributionCount}
                >
                  <Field.Label>枚数 / 上限</Field.Label>
                  <Input
                    type="number"
                    min={1}
                    {...editForm.register("distributionCount", {
                      valueAsNumber: true,
                    })}
                  />
                  {editForm.formState.errors.distributionCount && (
                    <Field.ErrorText>
                      {editForm.formState.errors.distributionCount.message}
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

      <Dialog.Root
        open={!!distributeTarget}
        onOpenChange={(details) => {
          if (!details.open) setDistributeTarget(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>クーポンを一斉配布</Dialog.Title>
              <Dialog.Description>
                「{distributeTarget?.name}
                」（¥{distributeTarget?.amountJPY.toLocaleString()}）を
                この事業所のすべての顧客に配布します。既に受け取り済みの顧客はスキップされます。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                loading={distributeMutation.isPending}
                loadingText="配布中..."
                onClick={onDistribute}
              >
                配布実行
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </styled.div>
  );
}
