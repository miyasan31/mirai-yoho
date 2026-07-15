import {
  getGetAvailableCouponsQueryKey,
  useGetAvailableCoupons,
  useReceiveBirthdayCoupon,
  useReceiveWelcomeCoupon,
} from "@mirai-yoho/api-client/api/customer/customer";
import type {
  AvailableCoupon,
  AvailableCouponIneligibilityReason,
  CouponType,
} from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/$organizationId/coupons")({
  component: OrganizationCouponsPage,
});

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  welcome: "初回登録特典",
  birthday: "誕生月",
};

const COUPON_TYPE_COLOR: Record<CouponType, "green" | "purple"> = {
  welcome: "green",
  birthday: "purple",
};

const INELIGIBILITY_LABEL: Record<AvailableCouponIneligibilityReason, string> =
  {
    "already-received": "取得済み",
    "not-in-birth-month": "誕生月ではありません",
    "limit-reached": "配布上限に達しました",
  };

function OrganizationCouponsPage() {
  const { organizationId } = Route.useParams();
  const { isSignedUp, isLoading } = useCustomerAuth();
  const queryClient = useQueryClient();

  const availableQuery = useGetAvailableCoupons(organizationId, {
    query: { enabled: isSignedUp },
  });
  const receiveWelcome = useReceiveWelcomeCoupon();
  const receiveBirthday = useReceiveBirthdayCoupon();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getGetAvailableCouponsQueryKey(organizationId),
    });

  const onReceive = async (coupon: AvailableCoupon) => {
    try {
      if (coupon.type === "welcome") {
        const result = await receiveWelcome.mutateAsync({ organizationId });
        toaster.success({
          title: `${coupon.name}を ${result.data.issuedCount} 枚受け取りました`,
        });
      } else {
        await receiveBirthday.mutateAsync({ organizationId });
        toaster.success({ title: `${coupon.name}を受け取りました` });
      }
      await invalidate();
    } catch {
      // custom-fetch でエラー Toast 表示済み
    }
  };

  if (isLoading) return <Spinner />;

  if (!isSignedUp) {
    return (
      <styled.div
        maxW="lg"
        mx="auto"
        p="8"
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          クーポン
        </Text>
        <Text color="fg.muted">
          クーポンを取得するには先にアカウント登録が必要です。
        </Text>
        <Button asChild>
          <Link to="/mypage/profile">プロフィール登録へ</Link>
        </Button>
      </styled.div>
    );
  }

  const coupons = availableQuery.data?.data?.coupons ?? null;
  const isPending = receiveWelcome.isPending || receiveBirthday.isPending;

  return (
    <styled.div
      maxW="lg"
      mx="auto"
      p="8"
      display="flex"
      flexDir="column"
      gap="4"
    >
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        取得可能なクーポン
      </Text>
      <Text textStyle="sm" color="fg.muted">
        この事業所で発行されているクーポンです。取得したクーポンは予約時に 1
        枚適用できます。
      </Text>

      {availableQuery.isError ? (
        <Text color="fg.error">クーポンの取得に失敗しました</Text>
      ) : coupons === null ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <Text color="fg.muted">現在取得可能なクーポンはありません。</Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2">
          {coupons.map((coupon) => (
            <styled.li
              key={coupon.couponId}
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
                  <Text fontWeight="medium">{coupon.name}</Text>
                  <Text fontWeight="bold">
                    ¥{coupon.amountJPY.toLocaleString()}
                  </Text>
                </styled.div>
                <Text textStyle="sm" color="fg.muted">
                  受け取り後 {coupon.expiresInDays} 日間有効
                  {coupon.type === "welcome" &&
                    ` / ${coupon.distributionCount} 枚まとめて配布`}
                </Text>
              </styled.div>
              {coupon.isReceivable ? (
                <Button
                  size="sm"
                  loading={isPending}
                  onClick={() => onReceive(coupon)}
                >
                  取得
                </Button>
              ) : (
                <Badge variant="subtle">
                  {coupon.ineligibilityReason
                    ? INELIGIBILITY_LABEL[coupon.ineligibilityReason]
                    : "取得不可"}
                </Badge>
              )}
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.div>
  );
}
