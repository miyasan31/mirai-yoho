import { Alert } from "@mirai-yoho/ui/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useBookingOutdatedPolicy } from "./use-booking-outdated-policy";

interface BookingOutdatedPolicyAlertProps {
  organizationId: string;
  booking: {
    startsAt: string;
    agreedTermsVersion: string | null;
    agreedCancellationPolicyVersion: string | null;
  };
}

const TYPE_LABEL: Record<"terms" | "cancellation_policy", string> = {
  terms: "利用規約",
  cancellation_policy: "キャンセルポリシー",
};

/**
 * 予約の同意版が現在有効な最新版から古い場合にアラートを表示。
 * 効力発生日 (effectiveFrom) が未来の版は候補にならないため、
 * 「まだ効力が及ばない未来版」で誤って警告することはない。
 */
export function BookingOutdatedPolicyAlert({
  organizationId,
  booking,
}: BookingOutdatedPolicyAlertProps) {
  const status = useBookingOutdatedPolicy(organizationId, booking);
  if (!status.isOutdated) return null;

  const outdatedList = status.outdatedTypes
    .map((type) => TYPE_LABEL[type])
    .join("・");

  return (
    <styled.div mb="3">
      <Alert.Root colorPalette="amber" variant="surface">
        <Alert.Icon>
          <TriangleAlert />
        </Alert.Icon>
        <styled.div flex="1">
          <Alert.Title>ポリシー更新後の予約です</Alert.Title>
          <Alert.Description>
            この予約は現在有効な{outdatedList}
            の最新版より前に取られています。顧客への連絡や運用時に留意してください。
          </Alert.Description>
        </styled.div>
      </Alert.Root>
    </styled.div>
  );
}
