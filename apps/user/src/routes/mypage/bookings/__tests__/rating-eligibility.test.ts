import { describe, expect, it } from "vitest";
import {
  getRatingBadge,
  isRatable,
  type RatingTargetBooking,
} from "../-rating-eligibility";

const ENDS_AT = "2026-05-01T10:30:00.000Z";
/** ENDS_AT + 30日（API が ratableUntil として返す値） */
const RATABLE_UNTIL = "2026-05-31T10:30:00.000Z";
const ENDS_AT_MS = new Date(ENDS_AT).getTime();
const RATABLE_UNTIL_MS = new Date(RATABLE_UNTIL).getTime();

function booking(
  overrides: Partial<RatingTargetBooking> = {},
): RatingTargetBooking {
  return {
    endsAt: ENDS_AT,
    isRated: false,
    ratableUntil: RATABLE_UNTIL,
    ...overrides,
  };
}

describe("isRatable", () => {
  it("鑑定終了後・期間内・未評価なら true", () => {
    expect(isRatable(booking(), ENDS_AT_MS + 60_000)).toBe(true);
  });

  it("鑑定終了時刻ちょうどから true", () => {
    expect(isRatable(booking(), ENDS_AT_MS)).toBe(true);
  });

  it("鑑定終了の1ミリ秒前は false", () => {
    expect(isRatable(booking(), ENDS_AT_MS - 1)).toBe(false);
  });

  it("受付期限ちょうどは true", () => {
    expect(isRatable(booking(), RATABLE_UNTIL_MS)).toBe(true);
  });

  it("受付期限の1ミリ秒後は false", () => {
    expect(isRatable(booking(), RATABLE_UNTIL_MS + 1)).toBe(false);
  });

  it("評価済みは false", () => {
    expect(isRatable(booking({ isRated: true }), ENDS_AT_MS + 60_000)).toBe(
      false,
    );
  });

  it("ratableUntil が null（pending / cancelled）は false", () => {
    expect(
      isRatable(booking({ ratableUntil: null }), ENDS_AT_MS + 60_000),
    ).toBe(false);
  });
});

describe("getRatingBadge", () => {
  it("評価可能なら unrated", () => {
    expect(getRatingBadge(booking(), ENDS_AT_MS + 60_000)).toBe("unrated");
  });

  it("評価済みなら rated（期限切れでも rated を優先する）", () => {
    expect(
      getRatingBadge(booking({ isRated: true }), RATABLE_UNTIL_MS + 1),
    ).toBe("rated");
  });

  it("鑑定未終了は何も出さない", () => {
    expect(getRatingBadge(booking(), ENDS_AT_MS - 1)).toBeNull();
  });

  it("受付期限切れは何も出さない", () => {
    expect(getRatingBadge(booking(), RATABLE_UNTIL_MS + 1)).toBeNull();
  });

  it("評価対象外（ratableUntil が null）は何も出さない", () => {
    expect(
      getRatingBadge(booking({ ratableUntil: null }), ENDS_AT_MS + 60_000),
    ).toBeNull();
  });
});
