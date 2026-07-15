import { useGetCustomerCoupons } from "@mirai-yoho/api-client/api/customer/customer";
import type { CouponType } from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
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
      <Text textStyle="sm" color="fg.muted">
        取得済みのクーポン一覧です。新しいクーポンは各事業所のクーポン画面から取得できます。
      </Text>

      {couponsQuery.isError ? (
        <Text color="fg.error">クーポンの取得に失敗しました</Text>
      ) : coupons === null ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <Text color="fg.muted">取得済みのクーポンはありません。</Text>
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
                <styled.div display="flex" alignItems="center" gap="2">
                  <Badge colorPalette={COUPON_TYPE_COLOR[coupon.type]}>
                    {COUPON_TYPE_LABEL[coupon.type]}
                  </Badge>
                  <Text fontWeight="medium">{coupon.couponName}</Text>
                  <Text fontWeight="bold">
                    ¥{coupon.amountJPY.toLocaleString()}
                  </Text>
                </styled.div>
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
