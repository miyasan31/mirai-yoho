"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Checkbox, Tabs } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminBookingSettings,
  useAdminConsultantRanks,
  useUpdateAdminBookingSettings,
  useUpdateAdminConsultantRanks,
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
type SettingsTab = "booking" | "business-hours" | "consultant-ranks" | "price";

type WeeklyRowForm = BusinessHoursFormValues["weekly"][number];
type ExceptionDayForm = BusinessHoursFormValues["exceptions"][number];
type ConsultantRankFormValues = {
  consultantRanks: Array<{ rankId: string; name: string }>;
  defaultConsultantRankId: string;
};
interface PricePlanRangeFormValues {
  minTotalJPY: number;
  maxTotalJPY: number;
}

function isSettingsTab(value: string | null): value is SettingsTab {
  return (
    value === "booking" ||
    value === "business-hours" ||
    value === "consultant-ranks" ||
    value === "price"
  );
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
  const { data: rankData, isLoading: isLoadingRanks } =
    useAdminConsultantRanks();
  const updateBookingSettings = useUpdateAdminBookingSettings();
  const updateConsultantRanks = useUpdateAdminConsultantRanks();
  const isReadOnly = role === "operator";
  const [initialized, setInitialized] = useState(false);
  const [initializedRanks, setInitializedRanks] = useState(false);
  const [persistedBusinessHours, setPersistedBusinessHours] = useState(
    BusinessHours.createDefault().toJSON(),
  );
  const [persistedPricePlanRange, setPersistedPricePlanRange] = useState({
    minTotalJPY: 0,
    maxTotalJPY: 100000,
  });
  const [currentTab, setCurrentTab] = useState<SettingsTab>("booking");

  const {
    control: bookingControl,
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
    control: rankControl,
    register: rankRegister,
    handleSubmit: handleRankSubmit,
    reset: resetRankForm,
    watch: watchRankForm,
    setValue: setRankValue,
  } = useForm<ConsultantRankFormValues>({
    defaultValues: {
      consultantRanks: [{ rankId: "standard", name: "標準" }],
      defaultConsultantRankId: "standard",
    },
  });

  const {
    register: priceRangeRegister,
    handleSubmit: handlePriceRangeSubmit,
    reset: resetPriceRangeForm,
  } = useForm<PricePlanRangeFormValues>({
    defaultValues: {
      minTotalJPY: 0,
      maxTotalJPY: 100000,
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

  const {
    fields: rankFields,
    append: appendRank,
    remove: removeRank,
    move: moveRank,
  } = useFieldArray({
    control: rankControl,
    name: "consultantRanks",
  });

  const consultantSelectionEnabled = watchBookingForm(
    "consultantSelectionEnabled",
  );
  const weeklyRows = watchBusinessForm("weekly");
  const exceptions = watchBusinessForm("exceptions");
  const rankRows = watchRankForm("consultantRanks");
  const defaultConsultantRankId = watchRankForm("defaultConsultantRankId");

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
    const nextPricePlanRange = data.data.pricePlanRange ?? {
      minTotalJPY: 0,
      maxTotalJPY: 100000,
    };
    resetPriceRangeForm(nextPricePlanRange);

    setPersistedBusinessHours(normalizedBusinessHours);
    setPersistedPricePlanRange(nextPricePlanRange);
    setInitialized(true);
  }, [
    data,
    initialized,
    resetBookingForm,
    resetBusinessForm,
    resetPriceRangeForm,
  ]);

  useEffect(() => {
    if (initializedRanks || !rankData?.data) return;
    resetRankForm({
      consultantRanks: rankData.data.consultantRanks,
      defaultConsultantRankId: rankData.data.defaultConsultantRankId,
    });
    setInitializedRanks(true);
  }, [initializedRanks, rankData, resetRankForm]);

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
        pricePlanRange: persistedPricePlanRange,
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
        pricePlanRange: persistedPricePlanRange,
      },
    });
    setPersistedBusinessHours(validatedBusinessHours);
  };

  const saveConsultantRankSettings = async (
    values: ConsultantRankFormValues,
  ) => {
    if (!organizationId || !initializedRanks || isReadOnly) {
      return;
    }

    const consultantRanks = values.consultantRanks.map((rank) => ({
      rankId: rank.rankId,
      name: rank.name.trim(),
    }));
    const hasBlankName = consultantRanks.some((rank) => !rank.name);
    if (hasBlankName) {
      toaster.create({
        type: "error",
        title: "ランク名を入力してください",
      });
      return;
    }
    const rankIds = new Set(consultantRanks.map((rank) => rank.rankId));
    if (!rankIds.has(values.defaultConsultantRankId)) {
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

  const removeConsultantRank = (index: number) => {
    const nextRanks = rankRows.filter((_, rankIndex) => rankIndex !== index);
    const removingRank = rankRows[index];
    removeRank(index);
    if (
      removingRank?.rankId === defaultConsultantRankId &&
      nextRanks[0]?.rankId
    ) {
      setRankValue("defaultConsultantRankId", nextRanks[0].rankId, {
        shouldDirty: true,
      });
    }
  };

  const savePriceRangeSettings = async (values: PricePlanRangeFormValues) => {
    if (!organizationId || !initialized || isReadOnly) {
      return;
    }
    const nextPricePlanRange = {
      minTotalJPY: Number(values.minTotalJPY),
      maxTotalJPY: Number(values.maxTotalJPY),
    };

    await updateBookingSettings.mutateAsync({
      organizationId,
      data: {
        consultantSelectionEnabled,
        businessHours: persistedBusinessHours,
        pricePlanRange: nextPricePlanRange,
      },
    });
    setPersistedPricePlanRange(nextPricePlanRange);
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
          <Tabs.Trigger value="consultant-ranks" disabled={isLoadingRanks}>
            相談員ランク
          </Tabs.Trigger>
          <Tabs.Trigger value="price" disabled={isLoading}>
            料金
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

            <Controller
              control={bookingControl}
              name="consultantSelectionEnabled"
              render={({ field }) => (
                <Checkbox.Root
                  checked={field.value}
                  cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
                  disabled={
                    isLoading || updateBookingSettings.isPending || isReadOnly
                  }
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
                  <styled.div display="flex" flexDirection="column" gap="1">
                    <Text fontWeight="medium">相談員を指名して予約できる</Text>
                    <Text textStyle="sm" color="fg.muted">
                      オフにすると、利用者は日時のみを選び、相談員は自動で割り当てられます。
                    </Text>
                  </styled.div>
                </Checkbox.Root>
              )}
            />

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
            <Controller
              control={businessControl}
              name="includePublicHolidays"
              render={({ field }) => (
                <Checkbox.Root
                  checked={field.value}
                  cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
                  disabled={
                    isLoading || updateBookingSettings.isPending || isReadOnly
                  }
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
                        <Checkbox.Root
                          checked={!field.value}
                          disabled={
                            isLoading ||
                            updateBookingSettings.isPending ||
                            isReadOnly
                          }
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
                    {...businessRegister(`weekly.${index}.startTime`)}
                    disabled={
                      row.isClosed ||
                      isLoading ||
                      updateBookingSettings.isPending ||
                      isReadOnly
                    }
                  />
                  <Input
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
                    <Input
                      type="date"
                      {...businessRegister(`exceptions.${index}.date`)}
                      disabled={
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                    />
                    <Controller
                      control={businessControl}
                      name={`exceptions.${index}.isClosed`}
                      render={({ field: checkboxField }) => (
                        <Checkbox.Root
                          checked={checkboxField.value}
                          disabled={
                            isLoading ||
                            updateBookingSettings.isPending ||
                            isReadOnly
                          }
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
                      {...businessRegister(`exceptions.${index}.startTime`)}
                      disabled={
                        isExceptionClosed ||
                        isLoading ||
                        updateBookingSettings.isPending ||
                        isReadOnly
                      }
                    />
                    <Input
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

        <Tabs.Content value="consultant-ranks">
          <styled.form
            onSubmit={handleRankSubmit(saveConsultantRankSettings)}
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
              {rankFields.map((field, index) => {
                const rank = rankRows[index] ?? field;
                const canRemove = rankFields.length > 1;

                return (
                  <styled.div
                    key={field.id}
                    display="grid"
                    gridTemplateColumns={{
                      base: "1fr",
                      md: "40px 1fr 112px 112px",
                    }}
                    gap="2"
                    alignItems="center"
                  >
                    <input
                      type="hidden"
                      {...rankRegister(`consultantRanks.${index}.rankId`)}
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
                        checked={defaultConsultantRankId === rank.rankId}
                        disabled={
                          isLoadingRanks ||
                          updateConsultantRanks.isPending ||
                          isReadOnly
                        }
                        onChange={() =>
                          setRankValue("defaultConsultantRankId", rank.rankId, {
                            shouldDirty: true,
                          })
                        }
                        aria-label={`${rank.name || "未入力"}をデフォルトランクにする`}
                      />
                    </styled.label>
                    <Input
                      {...rankRegister(`consultantRanks.${index}.name`)}
                      aria-label={`ランク名 ${index + 1}`}
                      disabled={
                        isLoadingRanks ||
                        updateConsultantRanks.isPending ||
                        isReadOnly
                      }
                    />
                    <styled.div display="flex" gap="1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          index === 0 ||
                          isLoadingRanks ||
                          updateConsultantRanks.isPending ||
                          isReadOnly
                        }
                        onClick={() => moveRank(index, index - 1)}
                      >
                        <ArrowUp size={16} />
                        上へ
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          index === rankFields.length - 1 ||
                          isLoadingRanks ||
                          updateConsultantRanks.isPending ||
                          isReadOnly
                        }
                        onClick={() => moveRank(index, index + 1)}
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
                      disabled={
                        !canRemove ||
                        isLoadingRanks ||
                        updateConsultantRanks.isPending ||
                        isReadOnly
                      }
                      onClick={() => removeConsultantRank(index)}
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
                disabled={
                  rankFields.length >= 5 ||
                  isLoadingRanks ||
                  updateConsultantRanks.isPending ||
                  isReadOnly
                }
                onClick={() => {
                  const rankId = crypto.randomUUID();
                  appendRank({ rankId, name: "" });
                }}
              >
                ランクを追加
              </Button>
              <Button
                type="submit"
                loading={updateConsultantRanks.isPending}
                loadingText="保存中..."
                disabled={isLoadingRanks || !initializedRanks || isReadOnly}
              >
                保存
              </Button>
            </styled.div>
          </styled.form>
        </Tabs.Content>

        <Tabs.Content value="price">
          <styled.form
            onSubmit={handlePriceRangeSubmit(savePriceRangeSettings)}
            display="flex"
            flexDirection="column"
            gap="4"
            maxW="480px"
          >
            <styled.div>
              <Text as="h2" textStyle="lg" fontWeight="semibold" mb="1">
                料金設定
              </Text>
              <Text color="fg.muted" textStyle="sm">
                相談員が作成でき、利用者が選択できる料金プランの税込金額範囲を設定します。
              </Text>
            </styled.div>

            <styled.div display="grid" gridTemplateColumns="1fr 1fr" gap="3">
              <styled.div>
                <Text textStyle="sm" mb="1">
                  下限
                </Text>
                <Input
                  type="number"
                  min={0}
                  max={100000}
                  {...priceRangeRegister("minTotalJPY", {
                    valueAsNumber: true,
                  })}
                  disabled={
                    isLoading || updateBookingSettings.isPending || isReadOnly
                  }
                />
              </styled.div>
              <styled.div>
                <Text textStyle="sm" mb="1">
                  上限
                </Text>
                <Input
                  type="number"
                  min={0}
                  max={100000}
                  {...priceRangeRegister("maxTotalJPY", {
                    valueAsNumber: true,
                  })}
                  disabled={
                    isLoading || updateBookingSettings.isPending || isReadOnly
                  }
                />
              </styled.div>
            </styled.div>

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
      </Tabs.Root>
    </styled.div>
  );
}
