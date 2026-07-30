import { useGetLatestPublishedPolicy } from "@mirai-yoho/api-client/api/public/public";

interface BookingLike {
  startsAt: string;
  agreedTermsVersion?: string | null;
  agreedCancellationPolicyVersion?: string | null;
}

/** 予約時に顧客が同意するのは利用者向けポリシーのため、比較対象は user_* に限る */
export type OutdatedPolicyType = "user_terms" | "user_cancellation_policy";

interface OutdatedPolicyStatus {
  isOutdated: boolean;
  outdatedTypes: OutdatedPolicyType[];
  latestTermsVersion: string | null;
  latestCancellationPolicyVersion: string | null;
}

/**
 * 予約が「同意時点の版」から更新された（かつ現在の予約時刻時点で新しい版が
 * 効力を持つ）ポリシーで運用されるかを判定する。
 *
 * 公開日 (effectiveFrom) 考慮:
 * - useGetLatestPublishedPolicy は effectiveFrom <= now の最新版を返すため、
 *   まだ効力発生前の未来版は候補にならない = 現時点で有効な最新版のみ比較する
 * - 予約 startsAt が現在より未来でも、比較は「今」の最新版で行う。
 *   予約時刻より前に新版が effective になった時点で自動的にアラートが立つ
 */
export function useBookingOutdatedPolicy(
  organizationId: string,
  booking: BookingLike | null,
): OutdatedPolicyStatus {
  const termsQuery = useGetLatestPublishedPolicy(organizationId, "user_terms", {
    query: { enabled: Boolean(organizationId) },
  });
  const cancellationPolicyQuery = useGetLatestPublishedPolicy(
    organizationId,
    "user_cancellation_policy",
    { query: { enabled: Boolean(organizationId) } },
  );

  const latestTerms = termsQuery.data?.data?.revision ?? null;
  const latestCancellationPolicy =
    cancellationPolicyQuery.data?.data?.revision ?? null;

  const outdatedTypes: OutdatedPolicyType[] = [];
  if (booking?.agreedTermsVersion && latestTerms) {
    if (booking.agreedTermsVersion !== latestTerms.version) {
      outdatedTypes.push("user_terms");
    }
  }
  if (booking?.agreedCancellationPolicyVersion && latestCancellationPolicy) {
    if (
      booking.agreedCancellationPolicyVersion !==
      latestCancellationPolicy.version
    ) {
      outdatedTypes.push("user_cancellation_policy");
    }
  }

  return {
    isOutdated: outdatedTypes.length > 0,
    outdatedTypes,
    latestTermsVersion: latestTerms?.version ?? null,
    latestCancellationPolicyVersion: latestCancellationPolicy?.version ?? null,
  };
}
