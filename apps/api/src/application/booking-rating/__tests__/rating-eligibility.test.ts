import {
  evaluateRatingEligibility,
  resolveRatableUntil,
} from "@/application/booking-rating/rating-eligibility";
import { Booking } from "@/domain/booking/booking";
import type { BookingStatusValue } from "@/domain/booking/booking-status";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { BookingRating } from "@/domain/booking-rating/booking-rating";

const STARTS_AT = new Date("2026-05-01T10:00:00.000Z");
const ENDS_AT = new Date("2026-05-01T10:30:00.000Z");
const EXPIRES_AT = new Date("2026-05-31T10:30:00.000Z"); // endsAt + 30日

function createBooking(status: BookingStatusValue): Booking {
  return Booking.reconstruct({
    organizationId: "org-1",
    bookingId: "booking-1",
    customerId: "customer-1",
    consultantId: "consultant-1",
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    durationMinutes: 30,
    status: BookingStatus.reconstruct(status),
    cancelDeadlineAt: CancelDeadline.create(STARTS_AT),
    consultantMemo: ConsultantMemo.empty(),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

const existingRating = BookingRating.create({
  organizationId: "org-1",
  bookingId: "booking-1",
  consultantId: "consultant-1",
  customerId: "customer-1",
  score: 4,
  consultedAt: STARTS_AT,
});

describe("evaluateRatingEligibility", () => {
  it.each(["pending", "cancelled"] as const)(
    "%s は BOOKING_NOT_RATABLE（ratableUntil も null）",
    (status) => {
      const result = evaluateRatingEligibility({
        booking: createBooking(status),
        existingRating: null,
        now: new Date("2026-05-02T00:00:00.000Z"),
      });
      expect(result.ratable).toBe(false);
      expect(result.code).toBe("BOOKING_NOT_RATABLE");
      expect(result.ratableUntil).toBeNull();
    },
  );

  it.each(["confirmed", "completed"] as const)(
    "%s かつ鑑定終了後・期間内なら評価できる",
    (status) => {
      const result = evaluateRatingEligibility({
        booking: createBooking(status),
        existingRating: null,
        now: new Date("2026-05-02T00:00:00.000Z"),
      });
      expect(result.ratable).toBe(true);
      expect(result.code).toBeNull();
      expect(result.reason).toBeNull();
      expect(result.ratableUntil?.toISOString()).toBe(EXPIRES_AT.toISOString());
    },
  );

  it("confirmed でも鑑定終了の1ミリ秒前なら BOOKING_NOT_FINISHED", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("confirmed"),
      existingRating: null,
      now: new Date(ENDS_AT.getTime() - 1),
    });
    expect(result.code).toBe("BOOKING_NOT_FINISHED");
    expect(result.ratableUntil?.toISOString()).toBe(EXPIRES_AT.toISOString());
  });

  it("鑑定終了時刻ちょうどから評価できる", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("confirmed"),
      existingRating: null,
      now: ENDS_AT,
    });
    expect(result.ratable).toBe(true);
  });

  it("受付期限ちょうどは評価できる", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("confirmed"),
      existingRating: null,
      now: EXPIRES_AT,
    });
    expect(result.ratable).toBe(true);
  });

  it("受付期限の1ミリ秒後は RATING_WINDOW_EXPIRED", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("confirmed"),
      existingRating: null,
      now: new Date(EXPIRES_AT.getTime() + 1),
    });
    expect(result.ratable).toBe(false);
    expect(result.code).toBe("RATING_WINDOW_EXPIRED");
  });

  it("評価済みなら RATING_ALREADY_SUBMITTED", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("completed"),
      existingRating,
      now: new Date("2026-05-02T00:00:00.000Z"),
    });
    expect(result.ratable).toBe(false);
    expect(result.code).toBe("RATING_ALREADY_SUBMITTED");
  });

  it("評価済みは期限切れよりも優先して報告する", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("completed"),
      existingRating,
      now: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(result.code).toBe("RATING_ALREADY_SUBMITTED");
  });

  it("評価できない場合は必ず日本語の理由が付く", () => {
    const result = evaluateRatingEligibility({
      booking: createBooking("pending"),
      existingRating: null,
      now: new Date("2026-05-02T00:00:00.000Z"),
    });
    expect(result.reason).toBe("この予約は評価の対象外です");
  });
});

describe("resolveRatableUntil", () => {
  it.each(["confirmed", "completed"] as const)(
    "%s は鑑定終了の30日後を返す",
    (status) => {
      expect(resolveRatableUntil(createBooking(status))?.toISOString()).toBe(
        EXPIRES_AT.toISOString(),
      );
    },
  );

  it.each(["pending", "cancelled"] as const)("%s は null を返す", (status) => {
    expect(resolveRatableUntil(createBooking(status))).toBeNull();
  });
});
