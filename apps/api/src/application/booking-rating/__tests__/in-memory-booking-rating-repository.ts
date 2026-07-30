import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { BookingRating } from "@/domain/booking-rating/booking-rating";
import {
  type IBookingRatingRepository,
  RATING_ALREADY_SUBMITTED,
} from "@/domain/booking-rating/booking-rating-repository";

/** テスト用のインメモリ実装。Doc ID = bookingId の一意性も再現する */
export class InMemoryBookingRatingRepository
  implements IBookingRatingRepository
{
  private readonly ratings: Map<string, BookingRating>;

  constructor(ratings: BookingRating[] = []) {
    this.ratings = new Map(
      ratings.map((rating) => [rating.getBookingId(), rating]),
    );
  }

  async findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<BookingRating | null> {
    const rating = this.ratings.get(bookingId);
    if (!rating) return null;
    return rating.getOrganizationId() === organizationId ? rating : null;
  }

  async findByBookingIds(bookingIds: string[]): Promise<BookingRating[]> {
    return bookingIds
      .map((bookingId) => this.ratings.get(bookingId))
      .filter((rating): rating is BookingRating => rating !== undefined);
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<BookingRating[]> {
    return [...this.ratings.values()]
      .filter(
        (rating) =>
          rating.getOrganizationId() === organizationId &&
          rating.getConsultantId() === consultantId,
      )
      .sort((a, b) => b.getRatedAt().getTime() - a.getRatedAt().getTime());
  }

  async create(rating: BookingRating): Promise<void> {
    if (this.ratings.has(rating.getBookingId())) {
      throw new DomainError(
        RATING_ALREADY_SUBMITTED,
        "Rating has already been submitted for this booking",
      );
    }
    this.ratings.set(rating.getBookingId(), rating);
  }
}
