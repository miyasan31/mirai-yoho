"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  useConsultantPricePlans,
  useCreateConsultantPricePlan,
  useDeleteConsultantPricePlan,
  useUpdateConsultantPricePlan,
} from "@/hooks/use-price-plans";

function getPricePlansQueryKey(organizationId: string) {
  return [`/organizations/${organizationId}/consultant/price-plans`] as const;
}

export default function ConsultantPricePlansPage() {
  const queryCustomer = useQueryClient();
  const { organizationId } = useOrganizationRouting();
  const { data, isLoading } = useConsultantPricePlans();
  const createPricePlan = useCreateConsultantPricePlan();
  const updatePricePlan = useUpdateConsultantPricePlan();
  const deletePricePlan = useDeleteConsultantPricePlan();
  const [name, setName] = useState("");
  const [totalJPY, setTotalJPY] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const pricePlans = data?.data?.pricePlans ?? [];
  const pricePlanRange = data?.data?.pricePlanRange;

  const invalidatePricePlans = async () => {
    if (!organizationId) return;
    await queryCustomer.invalidateQueries({
      queryKey: getPricePlansQueryKey(organizationId),
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
        },
      });
      setName("");
      setTotalJPY("");
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

  const handleRestore = async (pricePlanId: string) => {
    if (!organizationId) return;
    try {
      await updatePricePlan.mutateAsync({
        organizationId,
        pricePlanId,
        data: { restore: true },
      });
      await invalidatePricePlans();
      toaster.create({ type: "success", title: "料金プランを復元しました" });
    } catch {
      // customFetch displays the server-side validation error.
    }
  };

  const handleDelete = async (pricePlanId: string) => {
    if (!organizationId) return;
    try {
      await deletePricePlan.mutateAsync({ organizationId, pricePlanId });
      await invalidatePricePlans();
      toaster.create({ type: "success", title: "料金プランを削除しました" });
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
        gridTemplateColumns={{ base: "1fr", md: "1fr 180px auto" }}
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
            <Table.Header>税込金額</Table.Header>
            <Table.Header>状態</Table.Header>
            <Table.Header>操作</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {pricePlans.map((pricePlan) => {
            const isEditing = editingPlanId === pricePlan.pricePlanId;
            const isMuted =
              pricePlan.status === "deleted" || !pricePlan.isWithinCurrentRange;
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
                <Table.Cell>¥{pricePlan.totalJPY.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  {pricePlan.status === "deleted" ? (
                    <Badge variant="outline">削除済み</Badge>
                  ) : pricePlan.isWithinCurrentRange ? (
                    <Badge>有効</Badge>
                  ) : (
                    <Badge variant="outline">範囲外</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <styled.div display="flex" gap="2">
                    {pricePlan.status === "deleted" ? (
                      <Tooltip content="復元" showArrow>
                        <IconButton
                          size="sm"
                          variant="subtle"
                          onClick={() => handleRestore(pricePlan.pricePlanId)}
                        >
                          <RotateCcw size={16} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip content="削除" showArrow>
                        <IconButton
                          size="sm"
                          variant="subtle"
                          onClick={() => handleDelete(pricePlan.pricePlanId)}
                        >
                          <Trash2 size={16} />
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
