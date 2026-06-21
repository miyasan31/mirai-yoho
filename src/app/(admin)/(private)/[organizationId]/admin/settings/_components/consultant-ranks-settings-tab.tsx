"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { FormEventHandler } from "react";
import { useEffect, useState } from "react";
import type { FieldArrayWithId, UseFormRegister } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import {
  useAdminConsultantRanks,
  useUpdateAdminConsultantRanks,
} from "@/hooks/use-booking-settings";

export type ConsultantRankFormValues = {
  consultantRanks: Array<{ rankId: string; name: string }>;
  defaultConsultantRankId: string;
};

type ConsultantRanksSettingsTabProps = {
  register: UseFormRegister<ConsultantRankFormValues>;
  fields: FieldArrayWithId<ConsultantRankFormValues, "consultantRanks", "id">[];
  ranks: ConsultantRankFormValues["consultantRanks"];
  defaultRankId: string;
  isLoading: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  isInitialized: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSelectDefault: (rankId: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
};

function ConsultantRanksSettingsTabView({
  register,
  fields,
  ranks,
  defaultRankId,
  isLoading,
  isPending,
  isReadOnly,
  isInitialized,
  onSubmit,
  onSelectDefault,
  onMove,
  onRemove,
  onAdd,
}: ConsultantRanksSettingsTabProps) {
  const isDisabled = isLoading || isPending || isReadOnly;

  return (
    <styled.form
      onSubmit={onSubmit}
      display="flex"
      flexDirection="column"
      gap="4"
    >
      <styled.div>
        <Text as="h2" textStyle="lg" fontWeight="semibold" mb="1">
          相談員ランク設定
        </Text>
        <Text color="fg.muted" textStyle="sm">
          上にあるランクほど重要度が高く表示されます。
        </Text>
      </styled.div>
      <styled.div display="grid" gap="2">
        {fields.map((field, index) => {
          const rank = ranks[index] ?? field;
          return (
            <styled.div
              key={field.id}
              display="grid"
              gridTemplateColumns={{ base: "1fr", md: "40px 1fr 112px 112px" }}
              gap="2"
              alignItems="center"
            >
              <input
                type="hidden"
                {...register(`consultantRanks.${index}.rankId`)}
              />
              <styled.label
                display="flex"
                alignItems="center"
                justifyContent="center"
                minH="10"
              >
                <input
                  type="radio"
                  value={rank.rankId}
                  checked={defaultRankId === rank.rankId}
                  disabled={isDisabled}
                  onChange={() => onSelectDefault(rank.rankId)}
                  aria-label={`${rank.name || "未入力"}をデフォルトランクにする`}
                />
              </styled.label>
              <Input
                {...register(`consultantRanks.${index}.name`)}
                aria-label={`ランク名 ${index + 1}`}
                disabled={isDisabled}
              />
              <styled.div display="flex" gap="1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0 || isDisabled}
                  onClick={() => onMove(index, index - 1)}
                >
                  <ArrowUp size={16} />
                  上へ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === fields.length - 1 || isDisabled}
                  onClick={() => onMove(index, index + 1)}
                >
                  <ArrowDown size={16} />
                  下へ
                </Button>
              </styled.div>
              <Button
                type="button"
                variant="plain"
                size="sm"
                colorPalette="red"
                disabled={fields.length <= 1 || isDisabled}
                onClick={() => onRemove(index)}
              >
                <Trash2 size={16} />
                削除
              </Button>
            </styled.div>
          );
        })}
      </styled.div>
      <styled.div display="flex" gap="2">
        <Button
          type="button"
          variant="outline"
          disabled={fields.length >= 5 || isDisabled}
          onClick={onAdd}
        >
          ランクを追加
        </Button>
        <Button
          type="submit"
          loading={isPending}
          loadingText="保存中..."
          disabled={isLoading || !isInitialized || isReadOnly}
        >
          保存
        </Button>
      </styled.div>
    </styled.form>
  );
}

type ConsultantRanksSettingsTabContainerProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
};

export function ConsultantRanksSettingsTab({
  organizationId,
  isReadOnly,
}: ConsultantRanksSettingsTabContainerProps) {
  const { data, isLoading } = useAdminConsultantRanks();
  const updateConsultantRanks = useUpdateAdminConsultantRanks();
  const form = useForm<ConsultantRankFormValues>({
    defaultValues: {
      consultantRanks: [{ rankId: "standard", name: "標準" }],
      defaultConsultantRankId: "standard",
    },
  });
  const { reset } = form;
  const [initialized, setInitialized] = useState(false);
  const fieldArray = useFieldArray({
    control: form.control,
    name: "consultantRanks",
  });
  const ranks = form.watch("consultantRanks");
  const defaultRankId = form.watch("defaultConsultantRankId");
  useEffect(() => {
    if (initialized || !data?.data) return;
    reset({
      consultantRanks: data.data.consultantRanks,
      defaultConsultantRankId: data.data.defaultConsultantRankId,
    });
    setInitialized(true);
  }, [data, initialized, reset]);
  const save = async (values: ConsultantRankFormValues) => {
    if (!organizationId || isReadOnly) return;
    const consultantRanks = values.consultantRanks.map((rank) => ({
      rankId: rank.rankId,
      name: rank.name.trim(),
    }));
    if (consultantRanks.some((rank) => !rank.name)) {
      toaster.create({ type: "error", title: "ランク名を入力してください" });
      return;
    }
    if (
      !new Set(consultantRanks.map((rank) => rank.rankId)).has(
        values.defaultConsultantRankId,
      )
    ) {
      toaster.create({
        type: "error",
        title: "デフォルトランクを選択してください",
      });
      return;
    }
    await updateConsultantRanks.mutateAsync({
      organizationId,
      data: {
        consultantRanks,
        defaultConsultantRankId: values.defaultConsultantRankId,
      },
    });
  };
  const remove = (index: number) => {
    const removing = ranks[index];
    const nextRanks = ranks.filter((_, rankIndex) => rankIndex !== index);
    fieldArray.remove(index);
    if (removing?.rankId === defaultRankId && nextRanks[0]?.rankId)
      form.setValue("defaultConsultantRankId", nextRanks[0].rankId, {
        shouldDirty: true,
      });
  };
  return (
    <ConsultantRanksSettingsTabView
      register={form.register}
      fields={fieldArray.fields}
      ranks={ranks}
      defaultRankId={defaultRankId}
      isLoading={isLoading}
      isPending={updateConsultantRanks.isPending}
      isReadOnly={isReadOnly}
      isInitialized={initialized}
      onSubmit={form.handleSubmit(save)}
      onSelectDefault={(rankId) =>
        form.setValue("defaultConsultantRankId", rankId, { shouldDirty: true })
      }
      onMove={fieldArray.move}
      onRemove={remove}
      onAdd={() => fieldArray.append({ rankId: crypto.randomUUID(), name: "" })}
    />
  );
}
