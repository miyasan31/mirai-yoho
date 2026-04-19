"use client";

import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminBookingSettings,
  useUpdateAdminBookingSettings,
} from "@/hooks/use-booking-settings";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function AdminSettingsPage() {
  const { organizationId } = useOrganizationRouting();
  const { role } = useAuth();
  const { data, isLoading } = useAdminBookingSettings();
  const updateBookingSettings = useUpdateAdminBookingSettings();
  const isReadOnly = role === "operator";
  const [consultantSelectionEnabled, setConsultantSelectionEnabled] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    if (
      consultantSelectionEnabled === undefined &&
      typeof data?.data?.consultantSelectionEnabled === "boolean"
    ) {
      setConsultantSelectionEnabled(data.data.consultantSelectionEnabled);
    }
  }, [consultantSelectionEnabled, data]);

  const handleSave = async () => {
    if (
      !organizationId ||
      consultantSelectionEnabled === undefined ||
      isReadOnly
    ) {
      return;
    }

    await updateBookingSettings.mutateAsync({
      organizationId,
      data: { consultantSelectionEnabled },
    });
  };

  return (
    <styled.div maxW="xl" display="flex" flexDirection="column" gap="6">
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

      <styled.div
        shadow="sm"
        rounded="l2"
        border="1px solid"
        borderColor="border"
        p="6"
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
            checked={consultantSelectionEnabled ?? false}
            disabled={
              isLoading || updateBookingSettings.isPending || isReadOnly
            }
            onChange={(event) =>
              setConsultantSelectionEnabled(event.target.checked)
            }
          />
          <styled.div display="flex" flexDirection="column" gap="1">
            <Text fontWeight="medium">相談員を指名して予約できる</Text>
            <Text textStyle="sm" color="fg.muted">
              オフにすると、利用者は日時のみを選び、相談員は自動で割り当てられます。
            </Text>
          </styled.div>
        </styled.label>

        <styled.div display="flex" justifyContent="flex-end">
          <Button
            onClick={handleSave}
            loading={updateBookingSettings.isPending}
            loadingText="保存中..."
            disabled={
              isLoading ||
              consultantSelectionEnabled === undefined ||
              isReadOnly
            }
          >
            保存
          </Button>
        </styled.div>
      </styled.div>
    </styled.div>
  );
}
