import { getListPricePlansQueryKey } from "@mirai-yoho/api-client/api/consultant/consultant";
import type { CreatePricePlanRequestDurationMinutes } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { SUPPORTED_DURATION_MINUTES } from "@mirai-yoho/shared/slot-availability";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, RotateCcw } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import {
  useArchivePricePlan,
  useCreatePricePlan,
  usePricePlans,
  useUpdatePricePlan,
} from "@/hooks/use-price-plans";

export default function PricePlansPage() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganizationRouting();
  const { data, isLoading } = usePricePlans();
  const createPricePlan = useCreatePricePlan();
  const updatePricePlan = useUpdatePricePlan();
  const archivePricePlan = useArchivePricePlan();
  const [name, setName] = useState("");
  const [totalJPY, setTotalJPY] = useState("");
  const [durationMinutes, setDurationMinutes] =
    useState<CreatePricePlanRequestDurationMinutes>(30);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const pricePlans = data?.data?.pricePlans ?? [];
  const pricePlanRange = data?.data?.pricePlanRange;

  const invalidatePricePlans = async () => {
    if (!organizationId) return;
    await queryClient.invalidateQueries({
      queryKey: getListPricePlansQueryKey(organizationId),
    });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationId) return;
    try {
      await createPricePlan.mutateAsync({
        organizationId,
        data: {
          name,
          totalJPY: Number(totalJPY),
          durationMinutes,
        },
      });
      setName("");
      setTotalJPY("");
      setDurationMinutes(30);
      await invalidatePricePlans();
      toaster.create({ type: "success", title: "料金プランを作成しました" });
    } catch {
      // customFetch displays the server-side validation error.
    }
  };

  const handleRename = async (pricePlanId: string) => {
    if (!organizationId) return;
    try {
      await updatePricePlan.mutateAsync({
        organizationId,
        pricePlanId,
        data: { name: editingName },
      });
      setEditingPlanId(null);
      setEditingName("");
      await invalidatePricePlans();
      toaster.create({ type: "success", title: "料金プラン名を更新しました" });
    } catch {
      // customFetch displays the server-side validation error.
    }
  };

  const handleUnarchive = async (pricePlanId: string) => {
    if (!organizationId) return;
    try {
      await updatePricePlan.mutateAsync({
        organizationId,
        pricePlanId,
        data: { unarchive: true },
      });
      await invalidatePricePlans();
      toaster.create({ type: "success", title: "料金プランを復元しました" });
    } catch {
      // customFetch displays the server-side validation error.
    }
  };

  const handleArchive = async (pricePlanId: string) => {
    if (!organizationId) return;
    try {
      await archivePricePlan.mutateAsync({ organizationId, pricePlanId });
      await invalidatePricePlans();
      toaster.create({
        type: "success",
        title: "料金プランをアーカイブしました",
      });
    } catch {
      // customFetch displays the server-side validation error.
    }
  };

  if (isLoading) {
    return (
      <styled.div display="flex" flexDirection="column" gap="6">
        <Skeleton height="8" width="200px" />
        <Skeleton height="32" rounded="l2" />
      </styled.div>
    );
  }

  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          料金プラン
        </Text>
        {pricePlanRange && (
          <Text textStyle="sm" color="fg.muted">
            現在の設定範囲: ¥{pricePlanRange.minTotalJPY.toLocaleString()} 〜 ¥
            {pricePlanRange.maxTotalJPY.toLocaleString()}
          </Text>
        )}
      </styled.div>

      <styled.form
        onSubmit={handleCreate}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 140px 140px auto" }}
        gap="3"
        alignItems="end"
      >
        <Field.Root>
          <Field.Label>プラン名</Field.Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>相談時間</Field.Label>
          <styled.select
            value={durationMinutes}
            onChange={(event) =>
              setDurationMinutes(
                Number(
                  event.target.value,
                ) as CreatePricePlanRequestDurationMinutes,
              )
            }
            borderWidth="1px"
            borderColor="border.default"
            rounded="l2"
            px="3"
            py="2"
            bg="bg.default"
          >
            {SUPPORTED_DURATION_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}分
              </option>
            ))}
          </styled.select>
        </Field.Root>
        <Field.Root>
          <Field.Label>税込金額</Field.Label>
          <Input
            value={totalJPY}
            inputMode="numeric"
            onChange={(event) => setTotalJPY(event.target.value)}
          />
        </Field.Root>
        <Button type="submit" loading={createPricePlan.isPending}>
          作成
        </Button>
      </styled.form>

      <Table.Root>
        <Table.Head>
          <Table.Row>
            <Table.Header>プラン名</Table.Header>
            <Table.Header>相談時間</Table.Header>
            <Table.Header>税込金額</Table.Header>
            <Table.Header>状態</Table.Header>
            <Table.Header>操作</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {pricePlans.map((pricePlan) => {
            const isEditing = editingPlanId === pricePlan.pricePlanId;
            const isArchived = pricePlan.archivedAt !== null;
            const isMuted = isArchived || !pricePlan.isWithinCurrentRange;
            return (
              <Table.Row
                key={pricePlan.pricePlanId}
                opacity={isMuted ? 0.55 : 1}
              >
                <Table.Cell>
                  {isEditing ? (
                    <styled.div display="flex" gap="2">
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRename(pricePlan.pricePlanId)}
                        loading={updatePricePlan.isPending}
                      >
                        保存
                      </Button>
                    </styled.div>
                  ) : (
                    <Button
                      variant="plain"
                      onClick={() => {
                        setEditingPlanId(pricePlan.pricePlanId);
                        setEditingName(pricePlan.name);
                      }}
                    >
                      {pricePlan.name}
                    </Button>
                  )}
                </Table.Cell>
                <Table.Cell>{pricePlan.durationMinutes}分</Table.Cell>
                <Table.Cell>¥{pricePlan.totalJPY.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  {isArchived ? (
                    <Badge variant="outline">アーカイブ済み</Badge>
                  ) : pricePlan.isWithinCurrentRange ? (
                    <Badge>有効</Badge>
                  ) : (
                    <Badge variant="outline">範囲外</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <styled.div display="flex" gap="2">
                    {isArchived ? (
                      <Tooltip content="アーカイブ解除" showArrow>
                        <IconButton
                          size="sm"
                          variant="subtle"
                          onClick={() => handleUnarchive(pricePlan.pricePlanId)}
                        >
                          <RotateCcw size={16} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip content="アーカイブ" showArrow>
                        <IconButton
                          size="sm"
                          variant="subtle"
                          onClick={() => handleArchive(pricePlan.pricePlanId)}
                        >
                          <Archive size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </styled.div>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </styled.div>
  );
}
