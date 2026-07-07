import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { Tabs } from "@mirai-yoho/ui/components/ui";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import { useAdminBookingSettings } from "@/hooks/use-booking-settings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { BookingSettingsTab } from "./_components/booking-settings-tab";
import { BusinessHoursSettingsTab } from "./_components/business-hours-settings-tab";
import { ConsultantStatusesSettingsTab } from "./_components/consultant-statuses-settings-tab";
import { PricePlanRangeSettingsTab } from "./_components/price-plan-range-settings-tab";
import type { PricePlanRange } from "./_components/settings-types";

type SettingsTab =
  | "booking"
  | "business-hours"
  | "consultant-statuses"
  | "price";

function isSettingsTab(value: string | null): value is SettingsTab {
  return (
    value === "booking" ||
    value === "business-hours" ||
    value === "consultant-statuses" ||
    value === "price"
  );
}

export default function AdminSettingsPage() {
  const { organizationId } = useOrganizationRouting();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const tabQueryValue = typeof search.tab === "string" ? search.tab : null;
  const { hasPermission } = useAuth();
  const { data, isLoading } = useAdminBookingSettings();
  const isReadOnly = !hasPermission("admin.settings.manage");
  const canManageConsultantStatuses = hasPermission(
    "admin.consultants.status.manage",
  );
  const [currentTab, setCurrentTab] = useState<SettingsTab>("booking");
  const [initialized, setInitialized] = useState(false);
  const [consultantSelectionEnabled, setConsultantSelectionEnabled] =
    useState(true);
  const [businessHours, setBusinessHours] = useState(
    BusinessHours.createDefault().toJSON(),
  );
  const [pricePlanRange, setPricePlanRange] = useState<PricePlanRange>({
    minTotalJPY: 0,
    maxTotalJPY: 100000,
  });

  useEffect(() => {
    if (initialized || !data?.data) return;
    setConsultantSelectionEnabled(data.data.consultantSelectionEnabled);
    setBusinessHours(
      BusinessHours.create(
        data.data.businessHours ?? BusinessHours.createDefault().toJSON(),
      ).toJSON(),
    );
    setPricePlanRange(
      data.data.pricePlanRange ?? { minTotalJPY: 0, maxTotalJPY: 100000 },
    );
    setInitialized(true);
  }, [data, initialized]);
  useEffect(() => {
    setCurrentTab(isSettingsTab(tabQueryValue) ? tabQueryValue : "booking");
  }, [tabQueryValue]);
  const changeTab = (tab: SettingsTab) => {
    setCurrentTab(tab);
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({ ...previous, tab }),
      replace: true,
    });
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
            このロールでは設定を編集できません。閲覧のみ可能です。
          </Text>
        )}
      </styled.div>
      <Tabs.Root
        value={currentTab}
        onValueChange={({ value }) => {
          if (isSettingsTab(value)) changeTab(value);
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
          <Tabs.Trigger value="consultant-statuses">
            相談員ステータス
          </Tabs.Trigger>
          <Tabs.Trigger value="price" disabled={isLoading}>
            料金
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="booking">
          {initialized && (
            <BookingSettingsTab
              organizationId={organizationId ?? undefined}
              isReadOnly={isReadOnly}
              isLoading={isLoading || !initialized}
              initialConsultantSelectionEnabled={consultantSelectionEnabled}
              businessHours={businessHours}
              pricePlanRange={pricePlanRange}
              onConsultantSelectionChange={setConsultantSelectionEnabled}
            />
          )}
        </Tabs.Content>
        <Tabs.Content value="business-hours">
          {initialized && (
            <BusinessHoursSettingsTab
              organizationId={organizationId ?? undefined}
              isReadOnly={isReadOnly}
              isLoading={isLoading || !initialized}
              initialBusinessHours={businessHours}
              consultantSelectionEnabled={consultantSelectionEnabled}
              pricePlanRange={pricePlanRange}
              onBusinessHoursSaved={setBusinessHours}
            />
          )}
        </Tabs.Content>
        <Tabs.Content value="consultant-statuses">
          <ConsultantStatusesSettingsTab
            organizationId={organizationId ?? undefined}
            isReadOnly={!canManageConsultantStatuses}
          />
        </Tabs.Content>
        <Tabs.Content value="price">
          {initialized && (
            <PricePlanRangeSettingsTab
              organizationId={organizationId ?? undefined}
              isReadOnly={isReadOnly}
              isLoading={isLoading || !initialized}
              consultantSelectionEnabled={consultantSelectionEnabled}
              businessHours={businessHours}
              initialPricePlanRange={pricePlanRange}
              onPricePlanRangeSaved={setPricePlanRange}
            />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </styled.div>
  );
}
