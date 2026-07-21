import { valibotResolver } from "@hookform/resolvers/valibot";
import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { Checkbox } from "@mirai-yoho/ui/components/ui";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import type { FormEventHandler } from "react";
import type {
  Control,
  FieldArrayWithId,
  UseFormRegister,
} from "react-hook-form";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useUpdateConsoleBookingSettings } from "@/hooks/use-console-booking-settings";
import {
  type BusinessHoursFormValues,
  businessHoursFormSchema,
  getMinNewExceptionDate,
} from "../business-hours-form-schema";
import type { PricePlanRange } from "./settings-types";

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"] as const;

type BusinessHoursSettingsTabProps = {
  control: Control<BusinessHoursFormValues>;
  register: UseFormRegister<BusinessHoursFormValues>;
  weeklyRows: BusinessHoursFormValues["weekly"];
  exceptions: BusinessHoursFormValues["exceptions"];
  exceptionFields: FieldArrayWithId<
    BusinessHoursFormValues,
    "exceptions",
    "id"
  >[];
  isLoading: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  isInitialized: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onAddException: () => void;
  onRemoveException: (index: number) => void;
};

function BusinessHoursSettingsTabView({
  control,
  register,
  weeklyRows,
  exceptions,
  exceptionFields,
  isLoading,
  isPending,
  isReadOnly,
  isInitialized,
  onSubmit,
  onAddException,
  onRemoveException,
}: BusinessHoursSettingsTabProps) {
  const isDisabled = isLoading || isPending || isReadOnly;

  return (
    <styled.form
      onSubmit={onSubmit}
      display="flex"
      flexDirection="column"
      gap="3"
    >
      <Text as="h2" textStyle="lg" fontWeight="semibold">
        営業時間設定
      </Text>
      <Text color="fg.muted" textStyle="sm">
        通常営業は曜日ごとに設定し、必要に応じて単日例外を追加します。
      </Text>
      <Controller
        control={control}
        name="includePublicHolidays"
        render={({ field }) => (
          <Checkbox.Root
            checked={field.value}
            cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
            disabled={isDisabled}
            opacity={isLoading || isReadOnly ? 0.6 : 1}
            onCheckedChange={(details) =>
              field.onChange(details.checked === true)
            }
          >
            <Checkbox.HiddenInput
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
            />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>祝日を通常営業として扱う</Checkbox.Label>
          </Checkbox.Root>
        )}
      />
      <styled.div display="grid" gap="2">
        {weeklyRows.map((row, index) => (
          <styled.div
            key={row.dayOfWeek}
            display="grid"
            gridTemplateColumns="60px 100px 1fr 1fr"
            gap="2"
            alignItems="center"
          >
            <Text>{dayLabels[row.dayOfWeek]}</Text>
            <styled.div display="flex" alignItems="center" gap="2">
              <Controller
                control={control}
                name={`weekly.${index}.isClosed`}
                render={({ field }) => (
                  <Checkbox.Root
                    checked={!field.value}
                    disabled={isDisabled}
                    onCheckedChange={(details) =>
                      field.onChange(details.checked !== true)
                    }
                  >
                    <Checkbox.HiddenInput
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Root>
                )}
              />
              <Text textStyle="sm">営業</Text>
            </styled.div>
            <Input
              type="time"
              step={1800}
              {...register(`weekly.${index}.startTime`)}
              disabled={row.isClosed || isDisabled}
            />
            <Input
              type="time"
              step={1800}
              {...register(`weekly.${index}.endTime`)}
              disabled={row.isClosed || isDisabled}
            />
          </styled.div>
        ))}
      </styled.div>
      <styled.div
        mt="3"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text textStyle="sm" fontWeight="medium">
          単日例外
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={onAddException}
        >
          例外日を追加
        </Button>
      </styled.div>
      <styled.div display="grid" gap="2">
        {exceptionFields.map((field, index) => {
          const exception = exceptions[index];
          const isExceptionClosed = exception?.isClosed ?? field.isClosed;
          const isNew = exception?.isNew ?? field.isNew;
          return (
            <styled.div
              key={field.id}
              display="grid"
              gridTemplateColumns="1fr 80px 1fr 1fr 72px"
              gap="2"
              alignItems="center"
            >
              <Input
                type="date"
                min={isNew ? getMinNewExceptionDate() : undefined}
                {...register(`exceptions.${index}.date`)}
                disabled={isDisabled}
              />
              <Controller
                control={control}
                name={`exceptions.${index}.isClosed`}
                render={({ field: checkboxField }) => (
                  <Checkbox.Root
                    checked={checkboxField.value}
                    disabled={isDisabled}
                    onCheckedChange={(details) =>
                      checkboxField.onChange(details.checked === true)
                    }
                  >
                    <Checkbox.HiddenInput
                      name={checkboxField.name}
                      onBlur={checkboxField.onBlur}
                      ref={checkboxField.ref}
                    />
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Label>休業</Checkbox.Label>
                  </Checkbox.Root>
                )}
              />
              <Input
                type="time"
                step={1800}
                {...register(`exceptions.${index}.startTime`)}
                disabled={isExceptionClosed || isDisabled}
              />
              <Input
                type="time"
                step={1800}
                {...register(`exceptions.${index}.endTime`)}
                disabled={isExceptionClosed || isDisabled}
              />
              <Button
                type="button"
                variant="plain"
                size="sm"
                disabled={isDisabled}
                onClick={() => onRemoveException(index)}
              >
                削除
              </Button>
            </styled.div>
          );
        })}
      </styled.div>
      <styled.div display="flex" mt="4">
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

type BusinessHoursSettingsTabContainerProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
  isLoading: boolean;
  initialBusinessHours: ReturnType<BusinessHours["toJSON"]>;
  pricePlanRange: PricePlanRange;
  onBusinessHoursSaved: (value: ReturnType<BusinessHours["toJSON"]>) => void;
};

function getDefaultWeeklyRows(): BusinessHoursFormValues["weekly"] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    startTime: "10:00",
    endTime: "17:00",
  }));
}

function toWeeklyRows(
  businessHours: ReturnType<BusinessHours["toJSON"]>,
): BusinessHoursFormValues["weekly"] {
  const rowsByDay = new Map(
    businessHours.weekly.map((item) => [item.dayOfWeek, item]),
  );
  return getDefaultWeeklyRows().map((row) => {
    const source = rowsByDay.get(row.dayOfWeek);
    if (!source || source.isClosed)
      return { ...row, isClosed: source?.isClosed ?? false };
    return {
      ...row,
      startTime: source.timeWindows[0]?.startTime ?? row.startTime,
      endTime: source.timeWindows[0]?.endTime ?? row.endTime,
    };
  });
}

function toExceptions(
  businessHours: ReturnType<BusinessHours["toJSON"]>,
): BusinessHoursFormValues["exceptions"] {
  return businessHours.exceptions.map((item, index) => ({
    id: `${item.startDate}-${index}`,
    isNew: false,
    date: item.startDate,
    isClosed: item.isClosed,
    startTime: item.timeWindows[0]?.startTime ?? "10:00",
    endTime: item.timeWindows[0]?.endTime ?? "17:00",
  }));
}

export function BusinessHoursSettingsTab({
  organizationId,
  isReadOnly,
  isLoading,
  initialBusinessHours,
  pricePlanRange,
  onBusinessHoursSaved,
}: BusinessHoursSettingsTabContainerProps) {
  const updateBookingSettings = useUpdateConsoleBookingSettings();
  const form = useForm<BusinessHoursFormValues>({
    resolver: valibotResolver(businessHoursFormSchema),
    defaultValues: {
      includePublicHolidays: initialBusinessHours.includePublicHolidays,
      weekly: toWeeklyRows(initialBusinessHours),
      exceptions: toExceptions(initialBusinessHours),
    },
  });
  const fields = useFieldArray({ control: form.control, name: "exceptions" });
  const weeklyRows = form.watch("weekly");
  const exceptions = form.watch("exceptions");
  const save = async (values: BusinessHoursFormValues) => {
    if (!organizationId || isReadOnly) return;
    const invalidWeekly = values.weekly.find(
      (row) =>
        !row.isClosed &&
        (!/^([01]\d|2[0-3]):([03]0)$/.test(row.startTime) ||
          row.startTime >= row.endTime),
    );
    if (invalidWeekly) {
      toaster.create({
        type: "error",
        title: `${dayLabels[invalidWeekly.dayOfWeek]}曜日の営業時間が不正です`,
      });
      return;
    }
    const invalidException = values.exceptions.find(
      (item) =>
        !item.date ||
        (!item.isClosed &&
          (!/^([01]\d|2[0-3]):([03]0)$/.test(item.startTime) ||
            item.startTime >= item.endTime)),
    );
    if (invalidException) {
      toaster.create({ type: "error", title: "例外日の入力内容が不正です" });
      return;
    }
    try {
      const businessHours = BusinessHours.create({
        weekly: values.weekly.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          isClosed: row.isClosed,
          timeWindows: row.isClosed
            ? []
            : [{ startTime: row.startTime, endTime: row.endTime }],
        })),
        includePublicHolidays: values.includePublicHolidays,
        exceptions: values.exceptions.map((item) => ({
          startDate: item.date,
          endDate: item.date,
          isClosed: item.isClosed,
          timeWindows: item.isClosed
            ? []
            : [{ startTime: item.startTime, endTime: item.endTime }],
        })),
      }).toJSON();
      await updateBookingSettings.mutateAsync({
        organizationId,
        data: { businessHours, pricePlanRange },
      });
      onBusinessHoursSaved(businessHours);
    } catch {
      toaster.create({
        type: "error",
        title: "営業時間設定の保存に失敗しました",
      });
    }
  };
  return (
    <BusinessHoursSettingsTabView
      control={form.control}
      register={form.register}
      weeklyRows={weeklyRows}
      exceptions={exceptions}
      exceptionFields={fields.fields}
      isLoading={isLoading}
      isPending={updateBookingSettings.isPending}
      isReadOnly={isReadOnly}
      isInitialized
      onSubmit={form.handleSubmit(save, (errors) => {
        if (errors.exceptions) {
          toaster.create({
            type: "error",
            title: "新規の単日例外は一週間先以降の日付で入力してください",
          });
          return;
        }
        toaster.create({
          type: "error",
          title: "入力内容を確認してください",
        });
      })}
      onAddException={() =>
        fields.append({
          id: crypto.randomUUID(),
          isNew: true,
          date: "",
          isClosed: true,
          startTime: "10:00",
          endTime: "17:00",
        })
      }
      onRemoveException={fields.remove}
    />
  );
}
