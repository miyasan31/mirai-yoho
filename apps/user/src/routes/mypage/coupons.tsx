import {
  getGetCustomerCouponsQueryKey,
  useGetCustomerCoupons,
  useReceiveBirthdayCoupon,
  useReceiveWelcomeCoupon,
} from "@mirai-yoho/api-client/api/customer/customer";
import type { CouponType } from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
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
  general: "汎用",
};

const COUPON_TYPE_COLOR: Record<CouponType, "green" | "purple" | "blue"> = {
  welcome: "green",
  birthday: "purple",
  general: "blue",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ja-JP");
}

function CouponsPage() {
  const { isSignedUp, profile } = useCustomerAuth();
  const queryClient = useQueryClient();
  const couponsQuery = useGetCustomerCoupons({
    query: { enabled: isSignedUp },
  });
  const receiveWelcome = useReceiveWelcomeCoupon();
  const receiveBirthday = useReceiveBirthdayCoupon();

  const coupons = couponsQuery.data?.data?.coupons ?? null;

  // マイページから利用可能な組織一覧（一度でも利用したことがある組織）
  const orgIds = useMemo(() => {
    if (!coupons) return [];
    return Array.from(new Set(coupons.map((c) => c.organizationId)));
  }, [coupons]);

  const isBirthMonth = useMemo(() => {
    if (!profile?.birthDate) return false;
    const [, monthStr] = profile.birthDate.split("-");
    const month = Number(monthStr);
    return month === new Date().getMonth() + 1;
  }, [profile?.birthDate]);

  const hasReceivedWelcome = (organizationId: string) =>
    (coupons ?? []).some(
      (c) => c.organizationId === organizationId && c.type === "welcome",
    );

  const hasReceivedBirthdayThisMonth = (organizationId: string) => {
    const now = new Date();
    return (coupons ?? []).some((c) => {
      if (c.organizationId !== organizationId || c.type !== "birthday") {
        return false;
      }
      const receivedAt = new Date(c.receivedAt);
      return (
        receivedAt.getFullYear() === now.getFullYear() &&
        receivedAt.getMonth() === now.getMonth()
      );
    });
  };

  const onReceiveWelcome = async (organizationId: string) => {
    try {
      const result = await receiveWelcome.mutateAsync({ organizationId });
      toaster.success({
        title: `初回特典クーポンを ${result.data.issuedCount} 枚受け取りました`,
      });
      await queryClient.invalidateQueries({
        queryKey: getGetCustomerCouponsQueryKey(),
      });
    } catch {
      // custom-fetch でエラー Toast 表示済み
    }
  };

  const onReceiveBirthday = async (organizationId: string) => {
    try {
      await receiveBirthday.mutateAsync({ organizationId });
      toaster.success({ title: "誕生月クーポンを受け取りました" });
      await queryClient.invalidateQueries({
        queryKey: getGetCustomerCouponsQueryKey(),
      });
    } catch {
      // custom-fetch でエラー Toast 表示済み
    }
  };

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        クーポン
      </Text>

      {orgIds.length > 0 && (
        <styled.section
          border="1px solid"
          borderColor="border"
          rounded="l2"
          p="3"
          display="flex"
          flexDir="column"
          gap="2"
        >
          <Text fontWeight="medium">初回登録特典を受け取る</Text>
          <Text textStyle="sm" color="fg.muted">
            利用中の事業所ごとに初回登録特典クーポンを受け取れます（1回のみ）。
          </Text>
          {orgIds.map((orgId) => (
            <Button
              key={orgId}
              variant="outline"
              size="sm"
              disabled={hasReceivedWelcome(orgId) || receiveWelcome.isPending}
              onClick={() => onReceiveWelcome(orgId)}
            >
              {hasReceivedWelcome(orgId) ? "受け取り済み" : "特典を受け取る"}
            </Button>
          ))}
        </styled.section>
      )}

      {isBirthMonth && orgIds.length > 0 && (
        <styled.section
          border="1px solid"
          borderColor="border"
          rounded="l2"
          p="3"
          display="flex"
          flexDir="column"
          gap="2"
        >
          <Text fontWeight="medium">🎂 今月の誕生月クーポンを受け取る</Text>
          <Text textStyle="sm" color="fg.muted">
            誕生月内であれば、事業所ごとに1回だけ誕生月クーポンを受け取れます。
          </Text>
          {orgIds.map((orgId) => (
            <Button
              key={orgId}
              variant="outline"
              size="sm"
              disabled={
                hasReceivedBirthdayThisMonth(orgId) || receiveBirthday.isPending
              }
              onClick={() => onReceiveBirthday(orgId)}
            >
              {hasReceivedBirthdayThisMonth(orgId)
                ? "今月分は受け取り済み"
                : "誕生月クーポンを受け取る"}
            </Button>
          ))}
        </styled.section>
      )}

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
