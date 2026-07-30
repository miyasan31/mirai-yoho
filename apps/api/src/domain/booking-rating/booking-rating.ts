import { DomainError } from "@mirai-yoho/shared/domain-error";
import { RatingComment } from "@/domain/booking-rating/rating-comment";
import { RatingScore } from "@/domain/booking-rating/rating-score";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

function validateRequiredString(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError("INVALID_BOOKING_RATING", `${field} is required`);
  }
  return normalized;
}

export interface BookingRatingCreateProps {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerId: string;
  score: number;
  comment?: string;
  /** 鑑定日時（booking.startsAt）。console 表示のための非正規化 */
  consultedAt: Date;
  ratedAt?: Date;
}

export interface BookingRatingReconstructProps {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerId: string;
  score: RatingScore;
  comment: RatingComment;
  consultedAt: Date;
  ratedAt: Date;
}

/**
 * 会員が鑑定終了後に占い師へ付ける評価。
 *
 * 提出後は編集・削除できない仕様のため、状態を変更するメソッドを意図的に持たない。
 * 永続化側も 1 予約 1 評価（Doc ID = bookingId）で構造的に一意性を保証する。
 */
export class BookingRating extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly bookingId: string,
    private readonly consultantId: string,
    private readonly customerId: string,
    private readonly score: RatingScore,
    private readonly comment: RatingComment,
    private readonly consultedAt: Date,
    private readonly ratedAt: Date,
  ) {
    super();
  }

  static create(props: BookingRatingCreateProps): BookingRating {
    return new BookingRating(
      validateRequiredString(props.organizationId, "organizationId"),
      validateRequiredString(props.bookingId, "bookingId"),
      validateRequiredString(props.consultantId, "consultantId"),
      validateRequiredString(props.customerId, "customerId"),
      RatingScore.create(props.score),
      RatingComment.create(props.comment ?? ""),
      props.consultedAt,
      props.ratedAt ?? new Date(),
    );
  }

  static reconstruct(props: BookingRatingReconstructProps): BookingRating {
    return new BookingRating(
      props.organizationId,
      props.bookingId,
      props.consultantId,
      props.customerId,
      props.score,
      props.comment,
      props.consultedAt,
      props.ratedAt,
    );
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getScore(): RatingScore {
    return this.score;
  }

  getComment(): RatingComment {
    return this.comment;
  }

  getConsultedAt(): Date {
    return this.consultedAt;
  }

  getRatedAt(): Date {
    return this.ratedAt;
  }
}
