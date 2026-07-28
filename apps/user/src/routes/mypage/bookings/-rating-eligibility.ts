import type { MyBooking } from "@mirai-yoho/api-client/schemas";

/**
 * 評価判定に必要な最小の構造。テストでフルの MyBooking を組み立てずに済む。
 */
export type RatingTargetBooking = Pick<
  MyBooking,
  "endsAt" | "isRated" | "ratableUntil"
>;

export type RatingBadge = "unrated" | "rated" | null;

/**
 * 予約一覧に評価導線を出すかどうか。
 *
 * 「鑑定終了から30日」という業務定数はサーバー（RatingWindow）にのみ存在し、
 * ここでは API が返す ratableUntil と現在時刻を比べるだけ。
 * ratableUntil が null の予約（pending / cancelled）は評価対象になり得ない。
 */
export function isRatable(booking: RatingTargetBooking, now: number): boolean {
  if (booking.isRated) return false;
  if (!booking.ratableUntil) return false;

  const endsAtMs = new Date(booking.endsAt).getTime();
  const ratableUntilMs = new Date(booking.ratableUntil).getTime();

  return now >= endsAtMs && now <= ratableUntilMs;
}

/**
 * 予約カードに出すバッジ。期限切れは何も出さない（ステータスの「終了」だけが残る）。
 */
export function getRatingBadge(
  booking: RatingTargetBooking,
  now: number,
): RatingBadge {
  if (booking.isRated) return "rated";
  return isRatable(booking, now) ? "unrated" : null;
}
