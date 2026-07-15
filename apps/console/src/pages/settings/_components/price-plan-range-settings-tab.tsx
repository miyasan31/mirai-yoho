import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useUpdateConsoleBookingSettings } from "@/hooks/use-console-booking-settings";
import type { PersistedBusinessHours, PricePlanRange } from "./settings-types";

type PricePlanRangeSettingsTabProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
  isLoading: boolean;
  consultantSelectionEnabled: boolean;
  businessHours: PersistedBusinessHours;
  initialPricePlanRange: PricePlanRange;
  onPricePlanRangeSaved: (value: PricePlanRange) => void;
};

export function PricePlanRangeSettingsTab({
  organizationId,
  isReadOnly,
  isLoading,
  consultantSelectionEnabled,
  businessHours,
  initialPricePlanRange,
  onPricePlanRangeSaved,
}: PricePlanRangeSettingsTabProps) {
  const updateBookingSettings = useUpdateConsoleBookingSettings();
  const form = useForm<PricePlanRange>({
    defaultValues: initialPricePlanRange,
  });
  const isDisabled = isLoading || updateBookingSettings.isPending || isReadOnly;
  const save = async (values: PricePlanRange) => {
    if (!organizationId || isReadOnly) return;
    const pricePlanRange = {
      minTotalJPY: Number(values.minTotalJPY),
      maxTotalJPY: Number(values.maxTotalJPY),
    };
    await updateBookingSettings.mutateAsync({
      organizationId,
      data: { consultantSelectionEnabled, businessHours, pricePlanRange },
    });
    onPricePlanRangeSaved(pricePlanRange);
  };
  return (
    <styled.form
      onSubmit={form.handleSubmit(save)}
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
            上限
          </Text>
          <Input
            type="number"
            min={0}
            max={100000}
            {...form.register("maxTotalJPY", { valueAsNumber: true })}
            disabled={isDisabled}
          />
        </styled.div>
        <styled.div>
          <Text textStyle="sm" mb="1">
            下限
          </Text>
          <Input
            type="number"
            min={0}
            max={100000}
            {...form.register("minTotalJPY", { valueAsNumber: true })}
            disabled={isDisabled}
          />
        </styled.div>
      </styled.div>
      <styled.div display="flex">
        <Button
          type="submit"
          loading={updateBookingSettings.isPending}
          loadingText="保存中..."
          disabled={isLoading || isReadOnly}
        >
          保存
        </Button>
      </styled.div>
    </styled.form>
  );
}
