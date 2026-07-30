import { DomainError } from "@mirai-yoho/shared/domain-error";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import { RatingComment } from "@/domain/booking-rating/rating-comment";
import { RatingScore } from "@/domain/booking-rating/rating-score";

const baseProps = {
  organizationId: "org-1",
  bookingId: "booking-1",
  consultantId: "consultant-1",
  customerId: "customer-1",
  score: 5,
  consultedAt: new Date("2026-04-10T10:00:00Z"),
};

describe("BookingRating", () => {
  it("create() は各値を保持する", () => {
    const ratedAt = new Date("2026-04-10T12:00:00Z");
    const rating = BookingRating.create({
      ...baseProps,
      comment: "  とても良かった  ",
      ratedAt,
    });

    expect(rating.getOrganizationId()).toBe("org-1");
    expect(rating.getBookingId()).toBe("booking-1");
    expect(rating.getConsultantId()).toBe("consultant-1");
    expect(rating.getCustomerId()).toBe("customer-1");
    expect(rating.getScore().getValue()).toBe(5);
    expect(rating.getComment().getValue()).toBe("とても良かった");
    expect(rating.getConsultedAt().getTime()).toBe(
      baseProps.consultedAt.getTime(),
    );
    expect(rating.getRatedAt().getTime()).toBe(ratedAt.getTime());
  });

  it("create() は comment 未指定をコメントなしとして扱う", () => {
    const rating = BookingRating.create(baseProps);
    expect(rating.getComment().isEmpty()).toBe(true);
  });

  it("create() は ratedAt 未指定なら現在時刻を使う", () => {
    const before = Date.now();
    const rating = BookingRating.create(baseProps);
    expect(rating.getRatedAt().getTime()).toBeGreaterThanOrEqual(before);
  });

  it.each([
    "organizationId",
    "bookingId",
    "consultantId",
    "customerId",
  ] as const)("create() は %s が空文字なら DomainError を投げる", (field) => {
    expect(() => BookingRating.create({ ...baseProps, [field]: "  " })).toThrow(
      DomainError,
    );
  });

  it("create() は不正なスコアで DomainError を投げる", () => {
    expect(() => BookingRating.create({ ...baseProps, score: 0 })).toThrow(
      DomainError,
    );
  });

  it("reconstruct() は検証を行わない", () => {
    const rating = BookingRating.reconstruct({
      organizationId: "org-1",
      bookingId: "booking-1",
      consultantId: "consultant-1",
      customerId: "customer-1",
      score: RatingScore.reconstruct(9),
      comment: RatingComment.reconstruct("既存データ"),
      consultedAt: baseProps.consultedAt,
      ratedAt: new Date("2026-04-10T12:00:00Z"),
    });

    expect(rating.getScore().getValue()).toBe(9);
  });
});
