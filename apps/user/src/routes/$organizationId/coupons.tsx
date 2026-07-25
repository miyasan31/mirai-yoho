import {
  getGetAvailableCouponsQueryKey,
  useGetAvailableCoupons,
  useReceiveBirthdayCoupon,
  useReceiveWelcomeCoupon,
} from "@mirai-yoho/api-client/api/customer/customer";
import type {
  AvailableCoupon,
  CouponType,
} from "@mirai-yoho/api-client/schemas";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { pageHead } from "@/lib/head";

interface OrganizationCouponsSearch {
  returnTo?: "booking";
  consultantId?: string;
  startsAt?: string;
  selectionId?: string;
  durationMinutes?: number;
}

export const Route = createFileRoute("/$organizationId/coupons")({
  head: () => pageHead("クーポン一覧"),
  validateSearch: (
    search: Record<string, unknown>,
  ): OrganizationCouponsSearch => {
    const durationRaw = search.durationMinutes;
    const duration =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number(durationRaw)
          : undefined;
    return {
      returnTo: search.returnTo === "booking" ? "booking" : undefined,
      consultantId:
        typeof search.consultantId === "string"
          ? search.consultantId
          : undefined,
      startsAt:
        typeof search.startsAt === "string" ? search.startsAt : undefined,
      selectionId:
        typeof search.selectionId === "string" ? search.selectionId : undefined,
      durationMinutes:
        typeof duration === "number" && Number.isFinite(duration)
          ? duration
          : undefined,
    };
  },
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

function OrganizationCouponsPage() {
  const { organizationId } = Route.useParams();
  const { returnTo, consultantId, startsAt, selectionId, durationMinutes } =
    Route.useSearch();
  const { isSignedUp, isLoading } = useCustomerAuth();
  const queryClient = useQueryClient();

  const bookingReturnLink =
    returnTo === "booking"
      ? ({
          to: "/$organizationId/booking" as const,
          params: { organizationId },
          search: { consultantId, startsAt, selectionId, durationMinutes },
        } as const)
      : null;

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
      const result =
        coupon.type === "welcome"
          ? await receiveWelcome.mutateAsync({ organizationId })
          : await receiveBirthday.mutateAsync({ organizationId });
      toaster.success({
        title: `${coupon.name}を ${result.data.issuedCount} 枚受け取りました`,
      });
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
        {bookingReturnLink && (
          <styled.div display="flex" alignItems="center" gap="2">
            <Tooltip content="予約情報入力に戻る" showArrow>
              <IconButton variant="subtle" size="sm" asChild>
                <Link {...bookingReturnLink}>
                  <ArrowLeft size={18} />
                </Link>
              </IconButton>
            </Tooltip>
            <Text textStyle="sm" color="fg.muted">
              予約情報入力に戻る
            </Text>
          </styled.div>
        )}
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

  const allCoupons = availableQuery.data?.data?.coupons ?? null;
  const receivableCoupons = allCoupons?.filter((c) => c.isReceivable) ?? null;
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
      {bookingReturnLink && (
        <styled.div display="flex" alignItems="center" gap="2">
          <Tooltip content="予約情報入力に戻る" showArrow>
            <IconButton variant="subtle" size="sm" asChild>
              <Link {...bookingReturnLink}>
                <ArrowLeft size={18} />
              </Link>
            </IconButton>
          </Tooltip>
          <Text textStyle="sm" color="fg.muted">
            予約情報入力に戻る
          </Text>
        </styled.div>
      )}
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        取得可能なクーポン
      </Text>
      <Text textStyle="sm" color="fg.muted">
        この事業所で発行されているクーポンです。取得したクーポンは予約時に 1
        枚適用できます。
      </Text>

      {availableQuery.isError ? (
        <Text color="fg.error">クーポンの取得に失敗しました</Text>
      ) : receivableCoupons === null ? (
        <Spinner />
      ) : receivableCoupons.length === 0 ? (
        <Text color="fg.muted">現在取得可能なクーポンはありません。</Text>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2">
          {receivableCoupons.map((coupon) => (
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
                  {coupon.batchSize} 枚まとめて発行 / 受け取り後{" "}
                  {coupon.expiresInDays} 日間有効
                </Text>
              </styled.div>
              <Button
                size="sm"
                loading={isPending}
                onClick={() => onReceive(coupon)}
              >
                取得
              </Button>
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.div>
  );
}
