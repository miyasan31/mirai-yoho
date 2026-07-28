import type { BookingRating } from "@/domain/booking-rating/booking-rating";

/** 既に評価が存在する予約に対して create() したときの DomainError code */
export const RATING_ALREADY_SUBMITTED = "RATING_ALREADY_SUBMITTED";

/**
 * 評価は提出後に編集・削除できないため save() / delete() を定義しない。
 */
export interface IBookingRatingRepository {
  findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<BookingRating | null>;
  /** 未評価バッジ用の一括取得。マイページは組織横断なので organizationId を取らない */
  findByBookingIds(bookingIds: string[]): Promise<BookingRating[]>;
  /** console の占い師詳細用。ratedAt 降順 */
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<BookingRating[]>;
  /** 既存があれば DomainError(RATING_ALREADY_SUBMITTED) を投げる */
  create(rating: BookingRating): Promise<void>;
}
