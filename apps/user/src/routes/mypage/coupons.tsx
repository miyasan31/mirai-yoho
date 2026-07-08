import { useGetCustomerCoupons } from "@mirai-yoho/api-client/api/customer/customer";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/mypage/coupons")({
  component: CouponsPage,
});

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ja-JP");
}

function CouponsPage() {
  const { isSignedUp } = useCustomerAuth();
  const couponsQuery = useGetCustomerCoupons({
    query: { enabled: isSignedUp },
  });
  const coupons = couponsQuery.data?.data?.coupons ?? null;

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        クーポン
      </Text>
      {couponsQuery.isError ? (
        <Text color="fg.error">クーポンの取得に失敗しました</Text>
      ) : coupons === null ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <Text color="fg.muted">受け取り済みのクーポンはありません。</Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2">
          {coupons.map((coupon) => (
            <styled.li
              key={coupon.userCouponId}
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
                <Text fontWeight="medium">{coupon.couponId}</Text>
                <Text textStyle="sm" color="fg.muted">
                  受け取り日: {formatDate(coupon.receivedAt)}
                  {coupon.expiresAt
                    ? ` / 有効期限: ${formatDate(coupon.expiresAt)}`
                    : ""}
                </Text>
              </styled.div>
              {coupon.redeemedAt ? (
                <Badge variant="subtle">利用済み</Badge>
              ) : coupon.isRedeemable ? (
                <Badge colorPalette="green">利用可能</Badge>
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
