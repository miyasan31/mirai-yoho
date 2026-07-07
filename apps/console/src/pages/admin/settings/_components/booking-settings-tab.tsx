import { valibotResolver } from "@hookform/resolvers/valibot";
import { Checkbox } from "@mirai-yoho/ui/components/ui";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Controller, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useUpdateAdminBookingSettings } from "@/hooks/use-booking-settings";
import {
  type BookingSettingsFormValues,
  bookingSettingsFormSchema,
} from "../booking-settings-form-schema";
import type { PersistedBusinessHours, PricePlanRange } from "./settings-types";

type BookingSettingsTabProps = {
  organizationId: string | undefined;
  isReadOnly: boolean;
  isLoading: boolean;
  initialConsultantSelectionEnabled: boolean;
  businessHours: PersistedBusinessHours;
  pricePlanRange: PricePlanRange;
  onConsultantSelectionChange: (value: boolean) => void;
};

export function BookingSettingsTab({
  organizationId,
  isReadOnly,
  isLoading,
  initialConsultantSelectionEnabled,
  businessHours,
  pricePlanRange,
  onConsultantSelectionChange,
}: BookingSettingsTabProps) {
  const updateBookingSettings = useUpdateAdminBookingSettings();
  const form = useForm<BookingSettingsFormValues>({
    resolver: valibotResolver(bookingSettingsFormSchema),
    defaultValues: {
      consultantSelectionEnabled: initialConsultantSelectionEnabled,
    },
  });
  const isDisabled = isLoading || updateBookingSettings.isPending || isReadOnly;

  const save = async (values: BookingSettingsFormValues) => {
    if (!organizationId || isReadOnly) return;
    await updateBookingSettings.mutateAsync({
      organizationId,
      data: {
        consultantSelectionEnabled: values.consultantSelectionEnabled,
        businessHours,
        pricePlanRange,
      },
    });
  };

  return (
    <styled.form
      onSubmit={form.handleSubmit(save)}
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
        control={form.control}
        name="consultantSelectionEnabled"
        render={({ field }) => (
          <Checkbox.Root
            checked={field.value}
            cursor={isLoading || isReadOnly ? "not-allowed" : "pointer"}
            disabled={isDisabled}
            opacity={isLoading || isReadOnly ? 0.6 : 1}
            onCheckedChange={(details) => {
              const value = details.checked === true;
              field.onChange(value);
              onConsultantSelectionChange(value);
            }}
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
          disabled={isLoading || isReadOnly}
        >
          保存
        </Button>
      </styled.div>
    </styled.form>
  );
}
