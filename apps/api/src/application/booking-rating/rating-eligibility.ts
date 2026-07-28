import type { Booking } from "@/domain/booking/booking";
import type { BookingRating } from "@/domain/booking-rating/booking-rating";
import { RatingWindow } from "@/domain/booking-rating/rating-window";

export type RatingDisabledReasonCode =
  | "BOOKING_NOT_RATABLE"
  | "BOOKING_NOT_FINISHED"
  | "RATING_WINDOW_EXPIRED"
  | "RATING_ALREADY_SUBMITTED";

const RATING_DISABLED_REASON_MESSAGES: Record<
  RatingDisabledReasonCode,
  string
> = {
  BOOKING_NOT_RATABLE: "この予約は評価の対象外です",
  BOOKING_NOT_FINISHED: "鑑定が終了していないため評価できません",
  RATING_WINDOW_EXPIRED: "評価の受付期間（鑑定終了から30日）を過ぎています",
  RATING_ALREADY_SUBMITTED: "すでに評価を送信済みです",
};

export interface RatingEligibility {
  ratable: boolean;
  code: RatingDisabledReasonCode | null;
  reason: string | null;
  /** 評価の受付期限。評価対象になり得ない予約（pending / cancelled）は null */
  ratableUntil: Date | null;
}

function createIneligible(
  code: RatingDisabledReasonCode,
  ratableUntil: Date | null,
): RatingEligibility {
  return {
    ratable: false,
    code,
    reason: RATING_DISABLED_REASON_MESSAGES[code],
    ratableUntil,
  };
}

/**
 * 評価可能かどうかを判定する。
 *
 * Booking と BookingRating の 2 集約にまたがるため application 層に置く
 * （charge-eligibility.ts と同じ方針）。
 *
 * 仕様: status が completed または confirmed、かつ endsAt <= now <= endsAt + 30日、かつ未評価。
 * completed は課金バッチ経由でしか付かず、その時点で必ず endsAt を過ぎているため、
 * ステータス判定と期間判定を分けても仕様どおりに動く。
 */
export function evaluateRatingEligibility(params: {
  booking: Booking;
  existingRating: BookingRating | null;
  now?: Date;
}): RatingEligibility {
  const { booking, existingRating, now = new Date() } = params;
  const status = booking.getStatus().getValue();

  if (status !== "completed" && status !== "confirmed") {
    return createIneligible("BOOKING_NOT_RATABLE", null);
  }

  const window = RatingWindow.create(booking.getEndsAt());
  const ratableUntil = window.getExpiresAt();

  if (existingRating) {
    return createIneligible("RATING_ALREADY_SUBMITTED", ratableUntil);
  }

  if (!window.hasStarted(now)) {
    return createIneligible("BOOKING_NOT_FINISHED", ratableUntil);
  }

  if (window.isExpired(now)) {
    return createIneligible("RATING_WINDOW_EXPIRED", ratableUntil);
  }

  return { ratable: true, code: null, reason: null, ratableUntil };
}

/**
 * 予約一覧向け。理由文言が不要な場面で受付期限だけを導出する。
 */
export function resolveRatableUntil(booking: Booking): Date | null {
  const status = booking.getStatus().getValue();
  if (status !== "completed" && status !== "confirmed") return null;
  return RatingWindow.create(booking.getEndsAt()).getExpiresAt();
}
