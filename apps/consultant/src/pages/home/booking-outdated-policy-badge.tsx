import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { TriangleAlert } from "lucide-react";
import { useBookingOutdatedPolicy } from "./use-booking-outdated-policy";

interface BookingOutdatedPolicyBadgeProps {
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
 * 一覧表示向けのコンパクトなバッジ。予約が最新版より前の同意で作られている
 * ことを示す。effectiveFrom 考慮は useBookingOutdatedPolicy 側で行う。
 */
export function BookingOutdatedPolicyBadge({
  organizationId,
  booking,
}: BookingOutdatedPolicyBadgeProps) {
  const status = useBookingOutdatedPolicy(organizationId, booking);
  if (!status.isOutdated) return null;

  const outdatedList = status.outdatedTypes
    .map((type) => TYPE_LABEL[type])
    .join("・");

  return (
    <Tooltip
      content={`この予約は現在有効な ${outdatedList} より前の版で同意されています`}
      showArrow
    >
      <Badge colorPalette="amber" variant="surface" size="sm">
        <TriangleAlert size={12} />
        ポリシー更新後
      </Badge>
    </Tooltip>
  );
}
