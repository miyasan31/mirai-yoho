"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Tabs } from "@/components/ui";
import { Text } from "@/components/ui/text";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import { useAuth } from "@/hooks/use-auth";
import { useAdminBookingSettings } from "@/hooks/use-booking-settings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { BookingSettingsTab } from "./_components/booking-settings-tab";
import { BusinessHoursSettingsTab } from "./_components/business-hours-settings-tab";
import { ConsultantRanksSettingsTab } from "./_components/consultant-ranks-settings-tab";
import { PricePlanRangeSettingsTab } from "./_components/price-plan-range-settings-tab";
import type { PricePlanRange } from "./_components/settings-types";

type SettingsTab = "booking" | "business-hours" | "consultant-ranks" | "price";

function isSettingsTab(value: string | null): value is SettingsTab {
  return (
    value === "booking" ||
    value === "business-hours" ||
    value === "consultant-ranks" ||
    value === "price"
  );
}

export default function AdminSettingsPage() {
  const { organizationId } = useOrganizationRouting();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { data, isLoading } = useAdminBookingSettings();
  const isReadOnly = !hasPermission("admin.settings.manage");
  const canManageConsultantRanks = hasPermission(
    "admin.consultants.rank.manage",
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
    const tab = searchParams.get("tab");
    setCurrentTab(isSettingsTab(tab) ? tab : "booking");
  }, [searchParams]);
  const changeTab = (tab: SettingsTab) => {
    setCurrentTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
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
          <Tabs.Trigger value="consultant-ranks">相談員ランク</Tabs.Trigger>
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
        <Tabs.Content value="consultant-ranks">
          <ConsultantRanksSettingsTab
            organizationId={organizationId ?? undefined}
            isReadOnly={!canManageConsultantRanks}
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
