import {
  useAdminConsultantStatuses,
  useUpdateAdminConsultantStatuses,
} from "@mirai-yoho/console-core/hooks/use-booking-settings";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { FormEventHandler } from "react";
import { useEffect, useState } from "react";
import type { FieldArrayWithId, UseFormRegister } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";

export type ConsultantStatusFormValues = {
  consultantStatuses: Array<{ statusId: string; name: string }>;
  defaultConsultantStatusId: string;
};

type ConsultantStatusesSettingsTabProps = {
  register: UseFormRegister<ConsultantStatusFormValues>;
  fields: FieldArrayWithId<
    ConsultantStatusFormValues,
    "consultantStatuses",
    "id"
  >[];
  statuses: ConsultantStatusFormValues["consultantStatuses"];
  defaultStatusId: string;
  isLoading: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  isInitialized: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSelectDefault: (statusId: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
};

function ConsultantStatusesSettingsTabView({
  register,
  fields,
  statuses,
  defaultStatusId,
  isLoading,
  isPending,
  isReadOnly,
  isInitialized,
  onSubmit,
  onSelectDefault,
  onMove,
  onRemove,
  onAdd,
}: ConsultantStatusesSettingsTabProps) {
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
          相談員ステータス設定
        </Text>
        <Text color="fg.muted" textStyle="sm">
          上にあるステータスほど重要度が高く表示されます。
        </Text>
      </styled.div>
      <styled.div display="grid" gap="2">
        {fields.map((field, index) => {
          const status = statuses[index] ?? field;
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
                {...register(`consultantStatuses.${index}.statusId`)}
              />
              <styled.label
                display="flex"
                alignItems="center"
                justifyContent="center"
                minH="10"
              >
                <input
                  type="radio"
                  value={status.statusId}
                  checked={defaultStatusId === status.statusId}
                  disabled={isDisabled}
                  onChange={() => onSelectDefault(status.statusId)}
                  aria-label={`${status.name || "未入力"}をデフォルトステータスにする`}
                />
              </styled.label>
              <Input
                {...register(`consultantStatuses.${index}.name`)}
                aria-label={`ステータス名 ${index + 1}`}
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
          ステータスを追加
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

type ConsultantStatusesSettingsTabContainerProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
};

export function ConsultantStatusesSettingsTab({
  organizationId,
  isReadOnly,
}: ConsultantStatusesSettingsTabContainerProps) {
  const { data, isLoading } = useAdminConsultantStatuses();
  const updateConsultantStatuses = useUpdateAdminConsultantStatuses();
  const form = useForm<ConsultantStatusFormValues>({
    defaultValues: {
      consultantStatuses: [{ statusId: "standard", name: "標準" }],
      defaultConsultantStatusId: "standard",
    },
  });
  const { reset } = form;
  const [initialized, setInitialized] = useState(false);
  const fieldArray = useFieldArray({
    control: form.control,
    name: "consultantStatuses",
  });
  const statuses = form.watch("consultantStatuses");
  const defaultStatusId = form.watch("defaultConsultantStatusId");
  useEffect(() => {
    if (initialized || !data?.data) return;
    reset({
      consultantStatuses: data.data.consultantStatuses,
      defaultConsultantStatusId: data.data.defaultConsultantStatusId,
    });
    setInitialized(true);
  }, [data, initialized, reset]);
  const save = async (values: ConsultantStatusFormValues) => {
    if (!organizationId || isReadOnly) return;
    const consultantStatuses = values.consultantStatuses.map((status) => ({
      statusId: status.statusId,
      name: status.name.trim(),
    }));
    if (consultantStatuses.some((status) => !status.name)) {
      toaster.create({
        type: "error",
        title: "ステータス名を入力してください",
      });
      return;
    }
    if (
      !new Set(consultantStatuses.map((status) => status.statusId)).has(
        values.defaultConsultantStatusId,
      )
    ) {
      toaster.create({
        type: "error",
        title: "デフォルトステータスを選択してください",
      });
      return;
    }
    await updateConsultantStatuses.mutateAsync({
      organizationId,
      data: {
        consultantStatuses,
        defaultConsultantStatusId: values.defaultConsultantStatusId,
      },
    });
  };
  const remove = (index: number) => {
    const removing = statuses[index];
    const nextStatuses = statuses.filter(
      (_, statusIndex) => statusIndex !== index,
    );
    fieldArray.remove(index);
    if (removing?.statusId === defaultStatusId && nextStatuses[0]?.statusId)
      form.setValue("defaultConsultantStatusId", nextStatuses[0].statusId, {
        shouldDirty: true,
      });
  };
  return (
    <ConsultantStatusesSettingsTabView
      register={form.register}
      fields={fieldArray.fields}
      statuses={statuses}
      defaultStatusId={defaultStatusId}
      isLoading={isLoading}
      isPending={updateConsultantStatuses.isPending}
      isReadOnly={isReadOnly}
      isInitialized={initialized}
      onSubmit={form.handleSubmit(save)}
      onSelectDefault={(statusId) =>
        form.setValue("defaultConsultantStatusId", statusId, {
          shouldDirty: true,
        })
      }
      onMove={fieldArray.move}
      onRemove={remove}
      onAdd={() =>
        fieldArray.append({ statusId: crypto.randomUUID(), name: "" })
      }
    />
  );
}
