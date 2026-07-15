import { useGetCustomerCoupons } from "@mirai-yoho/api-client/api/customer/customer";
import type {
  CouponType,
  CustomerCoupon,
} from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/mypage/coupons")({
  component: CouponsPage,
});

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  welcome: "初回登録特典",
  birthday: "誕生月",
};

const COUPON_TYPE_COLOR: Record<CouponType, "green" | "purple"> = {
  welcome: "green",
  birthday: "purple",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ja-JP");
}

interface CouponGroup {
  couponId: string;
  couponName: string;
  amountJPY: number;
  type: CouponType;
  remainingCount: number;
  usedCount: number;
  expiredCount: number;
  earliestExpiresAt: string | null;
  latestReceivedAt: string;
}

function groupCoupons(coupons: CustomerCoupon[]): CouponGroup[] {
  const groups = new Map<string, CouponGroup>();
  for (const c of coupons) {
    const existing = groups.get(c.couponId);
    const isRemaining = !c.redeemedAt && c.isRedeemable;
    const isUsed = c.redeemedAt !== null;
    const isExpired = !c.redeemedAt && !c.isRedeemable;
    if (existing) {
      existing.remainingCount += isRemaining ? 1 : 0;
      existing.usedCount += isUsed ? 1 : 0;
      existing.expiredCount += isExpired ? 1 : 0;
      if (isRemaining && c.expiresAt) {
        if (
          !existing.earliestExpiresAt ||
          c.expiresAt < existing.earliestExpiresAt
        ) {
          existing.earliestExpiresAt = c.expiresAt;
        }
      }
      if (c.receivedAt > existing.latestReceivedAt) {
        existing.latestReceivedAt = c.receivedAt;
      }
    } else {
      groups.set(c.couponId, {
        couponId: c.couponId,
        couponName: c.couponName,
        amountJPY: c.amountJPY,
        type: c.type,
        remainingCount: isRemaining ? 1 : 0,
        usedCount: isUsed ? 1 : 0,
        expiredCount: isExpired ? 1 : 0,
        earliestExpiresAt: isRemaining ? c.expiresAt : null,
        latestReceivedAt: c.receivedAt,
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.latestReceivedAt < b.latestReceivedAt ? 1 : -1,
  );
}

function CouponsPage() {
  const { isSignedUp } = useCustomerAuth();
  const couponsQuery = useGetCustomerCoupons({
    query: { enabled: isSignedUp },
  });
  const coupons = couponsQuery.data?.data?.coupons ?? null;
  const groups = useMemo(
    () => (coupons ? groupCoupons(coupons) : null),
    [coupons],
  );

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        クーポン
      </Text>
      <Text textStyle="sm" color="fg.muted">
        取得済みのクーポン一覧です。新しいクーポンは各事業所のクーポン画面から取得できます。
      </Text>

      {couponsQuery.isError ? (
        <Text color="fg.error">クーポンの取得に失敗しました</Text>
      ) : groups === null ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <Text color="fg.muted">取得済みのクーポンはありません。</Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2">
          {groups.map((group) => (
            <styled.li
              key={group.couponId}
              border="1px solid"
              borderColor="border"
              rounded="l2"
              p="3"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="3"
            >
              <styled.div display="flex" flexDir="column" gap="1">
                <styled.div display="flex" alignItems="center" gap="2">
                  <Badge colorPalette={COUPON_TYPE_COLOR[group.type]}>
                    {COUPON_TYPE_LABEL[group.type]}
                  </Badge>
                  <Text fontWeight="medium">{group.couponName}</Text>
                  <Text fontWeight="bold">
                    ¥{group.amountJPY.toLocaleString()}
                  </Text>
                </styled.div>
                <Text textStyle="sm" color="fg.muted">
                  {group.remainingCount > 0 && group.earliestExpiresAt
                    ? `有効期限: ${formatDate(group.earliestExpiresAt)}`
                    : `受け取り日: ${formatDate(group.latestReceivedAt)}`}
                </Text>
              </styled.div>
              {group.remainingCount > 0 ? (
                <Badge colorPalette="green">
                  あと {group.remainingCount} 回利用可能
                </Badge>
              ) : group.usedCount > 0 ? (
                <Badge variant="subtle">利用済み</Badge>
              ) : (
                <Badge colorPalette="gray">期限切れ</Badge>
              )}
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.div>
  );
}
