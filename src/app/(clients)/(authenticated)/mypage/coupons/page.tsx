"use client";

import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface CouponItem {
  userCouponId: string;
  couponId: string;
  organizationId: string | null;
  receivedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  isRedeemable: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ja-JP");
}

export default function CouponsPage() {
  const { token } = useCustomerAuth();
  const [coupons, setCoupons] = useState<CouponItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/customer/me/coupons", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("クーポンの取得に失敗しました");
        }
        const data = (await response.json()) as { coupons: CouponItem[] };
        if (!cancelled) setCoupons(data.coupons);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "取得に失敗しました");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        クーポン
      </Text>
      {error && <Text color="fg.error">{error}</Text>}
      {coupons === null ? (
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
