"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Tabs } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminBookingSettings,
  useUpdateAdminBookingSettings,
} from "@/hooks/use-booking-settings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  type BookingSettingsFormValues,
  bookingSettingsFormSchema,
} from "./booking-settings-form-schema";
import {
  type BusinessHoursFormValues,
  businessHoursFormSchema,
} from "./business-hours-form-schema";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
type SettingsTab = "booking" | "business-hours";

type WeeklyRowForm = BusinessHoursFormValues["weekly"][number];
type ExceptionDayForm = BusinessHoursFormValues["exceptions"][number];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "booking" || value === "business-hours";
}

function isValidHalfHourTime(value: string): boolean {
  const matched = /^([01]\d|2[0-3]):([03]0)$/.exec(value);
  return Boolean(matched);
}

function isValidRange(startTime: string, endTime: string): boolean {
  if (!isValidHalfHourTime(startTime) || !isValidHalfHourTime(endTime)) {
    return false;
  }
  return startTime < endTime;
}

function getDefaultWeeklyRows(): WeeklyRowForm[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    startTime: "10:00",
    endTime: "17:00",
  }));
}

function toWeeklyRows(
  businessHours: ReturnType<BusinessHours["toJSON"]>,
): WeeklyRowForm[] {
  const defaults = getDefaultWeeklyRows();
  const map = new Map(
    businessHours.weekly.map((item) => [item.dayOfWeek, item]),
  );
  return defaults.map((row) => {
    const source = map.get(row.dayOfWeek);
    if (!source) return row;
    if (source.isClosed) {
      return { ...row, isClosed: true };
    }
    const firstWindow = source.timeWindows[0];
    return {
      ...row,
      isClosed: false,
      startTime: firstWindow?.startTime ?? row.startTime,
      endTime: firstWindow?.endTime ?? row.endTime,
    };
  });
}

function toExceptions(
  businessHours: ReturnType<BusinessHours["toJSON"]>,
): ExceptionDayForm[] {
  return businessHours.exceptions.map((item, index) => ({
    id: `${item.startDate}-${index}`,
    date: item.startDate,
    isClosed: item.isClosed,
    startTime: item.timeWindows[0]?.startTime ?? "10:00",
    endTime: item.timeWindows[0]?.endTime ?? "17:00",
  }));
}

export default function AdminSettingsPage() {
  const { organizationId } = useOrganizationRouting();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const { data, isLoading } = useAdminBookingSettings();
  const updateBookingSettings = useUpdateAdminBookingSettings();
  const isReadOnly = role === "operator";
  const [initialized, setInitialized] = useState(false);
  const [persistedBusinessHours, setPersistedBusinessHours] = useState(
    BusinessHours.createDefault().toJSON(),
  );
  const [currentTab, setCurrentTab] = useState<SettingsTab>("booking");

  const {
    register: bookingRegister,
    handleSubmit: handleBookingSubmit,
    reset: resetBookingForm,
    watch: watchBookingForm,
  } = useForm<BookingSettingsFormValues>({
    resolver: valibotResolver(bookingSettingsFormSchema),
    defaultValues: {
      consultantSelectionEnabled: true,
    },
  });

  const {
    control: businessControl,
    register: businessRegister,
    handleSubmit: handleBusinessSubmit,
    reset: resetBusinessForm,
    watch: watchBusinessForm,
  } = useForm<BusinessHoursFormValues>({
    resolver: valibotResolver(businessHoursFormSchema),
    defaultValues: {
      includePublicHolidays: true,
      weekly: getDefaultWeeklyRows(),
      exceptions: [],
    },
  });

  const {
    fields: exceptionFields,
    append,
    remove,
  } = useFieldArray({
    control: businessControl,
    name: "exceptions",
  });

  const consultantSelectionEnabled = watchBookingForm(
    "consultantSelectionEnabled",
  );
  const includePublicHolidays = watchBusinessForm("includePublicHolidays");
  const weeklyRows = watchBusinessForm("weekly");
  const exceptions = watchBusinessForm("exceptions");

  useEffect(() => {
    if (initialized || !data?.data) return;

    const normalizedBusinessHours = BusinessHours.create(
      data.data.businessHours ?? BusinessHours.createDefault().toJSON(),
    ).toJSON();

    resetBookingForm({
      consultantSelectionEnabled: data.data.consultantSelectionEnabled,
    });
    resetBusinessForm({
      includePublicHolidays: normalizedBusinessHours.includePublicHolidays,
      weekly: toWeeklyRows(normalizedBusinessHours),
      exceptions: toExceptions(normalizedBusinessHours),
    });

    setPersistedBusinessHours(normalizedBusinessHours);
    setInitialized(true);
  }, [data, initialized, resetBookingForm, resetBusinessForm]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    setCurrentTab(isSettingsTab(tabParam) ? tabParam : "booking");
  }, [searchParams]);

  const buildBusinessHoursOrShowError = (values: BusinessHoursFormValues) => {
    const businessHoursInput = {
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
    } as const;

    try {
      return BusinessHours.create(businessHoursInput).toJSON();
    } catch {
      toaster.create({
        type: "error",
        title: "営業時間設定の保存に失敗しました",
      });
      return null;
    }
  };

  const saveBookingSettings = async (values: BookingSettingsFormValues) => {
    if (!organizationId || !initialized || isReadOnly) {
      return;
    }

    await updateBookingSettings.mutateAsync({
      organizationId,
      data: {
        consultantSelectionEnabled: values.consultantSelectionEnabled,
        businessHours: persistedBusinessHours,
      },
    });
  };

  const saveBusinessHoursSettings = async (values: BusinessHoursFormValues) => {
    if (!organizationId || !initialized || isReadOnly) {
      return;
    }

    const invalidWeeklyRow = values.weekly.find(
      (row) => !row.isClosed && !isValidRange(row.startTime, row.endTime),
    );
    if (invalidWeeklyRow) {
      toaster.create({
        type: "error",
        title: `${DAY_LABELS[invalidWeeklyRow.dayOfWeek]}曜日の営業時間が不正です`,
      });
      return;
    }

    const invalidException = values.exceptions.find((item) => {
      if (!item.date) return true;
      if (item.isClosed) return false;
      return !isValidRange(item.startTime, item.endTime);
    });
    if (invalidException) {
      toaster.create({
        type: "error",
        title: "例外日の入力内容が不正です",
      });
      return;
    }

    const validatedBusinessHours = buildBusinessHoursOrShowError(values);
    if (!validatedBusinessHours) {
      return;
    }

    await updateBookingSettings.mutateAsync({
      organizationId,
      data: {
        consultantSelectionEnabled,
        businessHours: validatedBusinessHours,
      },
    });
    setPersistedBusinessHours(validatedBusinessHours);
  };

  const changeTab = (nextTab: SettingsTab) => {
    setCurrentTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          設定
        </Text>
        <Text textStyle="sm" color="fg.muted">
          予約導線など、組織全体の運用ルールを設定する画面です。
        </Text>
        {isReadOnly && (
          <Text textStyle="sm" color="fg.muted" mt="2">
            オペレーター権限では設定を編集できません。閲覧のみ可能です。
          </Text>
        )}
      </styled.div>

      <Tabs.Root
        value={currentTab}
        onValueChange={({ value }) => {
          if (isSettingsTab(value)) {
            changeTab(value);
          }
        }}
        variant="line"
      >
        <Tabs.List mb="4">
          <Tabs.Trigger value="booking" disabled={isLoading}>
            予約
          </Tabs.Trigger>
          <Tabs.Trigger value="business-hours" disabled={isLoading}>
            営業時間
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Content value="booking">
          <styled.form
            onSubmit={handleBookingSubmit(saveBookingSettings)}
            display="flex"
            flexDirection="column"
            gap="4"
          >
            <styled.div>
              <Text as="h2" textStyle="lg" fontWeight="semibold" mb="1">
                予約設定
              </Text>
              <Text color="fg.muted" textStyle="sm">
                相談員を指名して予約する導線を有効にするか設定します。
              </Text>
            </styled.div>

            <styled.label
              display="flex"
              alignItems="center"
              gap="3"
              cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
              opacity={isLoading || isReadOnly ? 0.6 : 1}
            >
              <input
                type="checkbox"
                {...bookingRegister("consultantSelectionEnabled")}
                disabled={
                  isLoading || updateBookingSettings.isPending || isReadOnly
                }
              />
              <styled.div display="flex" flexDirection="column" gap="1">
                <Text fontWeight="medium">相談員を指名して予約できる</Text>
                <Text textStyle="sm" color="fg.muted">
                  オフにすると、利用者は日時のみを選び、相談員は自動で割り当てられます。
                </Text>
              </styled.div>
            </styled.label>

            <styled.div display="flex">
              <Button
                type="submit"
                loading={updateBookingSettings.isPending}
                loadingText="保存中..."
                disabled={isLoading || !initialized || isReadOnly}
              >
                保存
              </Button>
            </styled.div>
          </styled.form>
        </Tabs.Content>

        <Tabs.Content value="business-hours">
          <styled.form
            onSubmit={handleBusinessSubmit(saveBusinessHoursSettings)}
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
            <styled.label
              display="flex"
              alignItems="center"
              gap="3"
              cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
              opacity={isLoading || isReadOnly ? 0.6 : 1}
            >
              <input
                type="checkbox"
                {...businessRegister("includePublicHolidays")}
                checked={includePublicHolidays}
                disabled={
                  isLoading || updateBookingSettings.isPending || isReadOnly
                }
              />
              <Text textStyle="sm">祝日を通常営業として扱う</Text>
            </styled.label>

            <styled.div display="grid" gap="2">
              {weeklyRows?.map((row, index) => (
                <styled.div
                  key={row.dayOfWeek}
                  display="grid"
                  gridTemplateColumns="60px 100px 1fr 1fr"
                  gap="2"
                  alignItems="center"
                >
                  <Text>{DAY_LABELS[row.dayOfWeek]}</Text>
                  <styled.div display="flex" alignItems="center" gap="2">
                    <Controller
                      control={businessControl}
                      name={`weekly.${index}.isClosed`}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          checked={!field.value}
                          disabled={
                            isLoading ||
                            updateBookingSettings.isPending ||
                            isReadOnly
                          }
                          onChange={(event) =>
                            field.onChange(!event.target.checked)
                          }
                        />
                      )}
                    />
                    <Text textStyle="sm">営業</Text>
                  </styled.div>
                  <input
                    type="time"
                    step={1800}
                    {...businessRegister(`weekly.${index}.startTime`)}
                    disabled={
                      row.isClosed ||
                      isLoading ||
                      updateBookingSettings.isPending ||
                      isReadOnly
                    }
                  />
                  <input
                    type="time"
                    step={1800}
                    {...businessRegister(`weekly.${index}.endTime`)}
                    disabled={
                      row.isClosed ||
                      isLoading ||
                      updateBookingSettings.isPending ||
                      isReadOnly
                    }
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
                disabled={
                  isLoading || updateBookingSettings.isPending || isReadOnly
                }
                onClick={() =>
                  append({
                    id: crypto.randomUUID(),
                    date: "",
                    isClosed: true,
                    startTime: "10:00",
                    endTime: "17:00",
                  })
                }
              >
                例外日を追加
              </Button>
            </styled.div>

            <styled.div display="grid" gap="2">
              {exceptionFields.map((field, index) => {
                const exception = exceptions?.[index];
                const isExceptionClosed = exception?.isClosed ?? field.isClosed;

                return (
                  <styled.div
                    key={field.id}
                    display="grid"
                    gridTemplateColumns="1fr 80px 1fr 1fr 72px"
                    gap="2"
                    alignItems="center"
                  >
                    <input
                      type="date"
                      {...businessRegister(`exceptions.${index}.date`)}
                      disabled={
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                    />
                    <styled.label display="flex" alignItems="center" gap="1">
                      <input
                        type="checkbox"
                        {...businessRegister(`exceptions.${index}.isClosed`)}
                        disabled={
                          isLoading ||
                          updateBookingSettings.isPending ||
                          isReadOnly
                        }
                      />
                      <Text textStyle="sm">休業</Text>
                    </styled.label>
                    <input
                      type="time"
                      step={1800}
                      {...businessRegister(`exceptions.${index}.startTime`)}
                      disabled={
                        isExceptionClosed ||
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                    />
                    <input
                      type="time"
                      step={1800}
                      {...businessRegister(`exceptions.${index}.endTime`)}
                      disabled={
                        isExceptionClosed ||
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                    />
                    <Button
                      type="button"
                      variant="plain"
                      size="sm"
                      disabled={
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                      onClick={() => remove(index)}
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
                loading={updateBookingSettings.isPending}
                loadingText="保存中..."
                disabled={isLoading || !initialized || isReadOnly}
              >
                保存
              </Button>
            </styled.div>
          </styled.form>
        </Tabs.Content>
      </Tabs.Root>
    </styled.div>
  );
}
