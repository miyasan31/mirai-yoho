import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  evaluateRatingEligibility,
  type RatingDisabledReasonCode,
} from "@/application/booking-rating/rating-eligibility";
import { resolveOwnedBooking } from "@/application/booking-rating/resolve-owned-booking";
import { AppError } from "@/application/shared/app-error";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import {
  type IBookingRatingRepository,
  RATING_ALREADY_SUBMITTED,
} from "@/domain/booking-rating/booking-rating-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

interface SubmitBookingRatingInput {
  userId: string;
  bookingId: string;
  score: number;
  comment?: string;
  now?: Date;
}

export interface SubmitBookingRatingResult {
  bookingId: string;
  score: number;
  comment: string | null;
  ratedAt: Date;
}

const RATING_DISABLED_STATUS: Record<RatingDisabledReasonCode, number> = {
  BOOKING_NOT_RATABLE: 409,
  BOOKING_NOT_FINISHED: 409,
  RATING_WINDOW_EXPIRED: 409,
  RATING_ALREADY_SUBMITTED: 409,
};

export class SubmitBookingRatingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly bookingRatingRepository: IBookingRatingRepository,
  ) {}

  async execute(
    input: SubmitBookingRatingInput,
  ): Promise<SubmitBookingRatingResult> {
    // 1. 所有権を最優先で検証する。他人の予約には期間もスコアも一切漏らさない
    const booking = await resolveOwnedBooking({
      bookingRepository: this.bookingRepository,
      customerRepository: this.customerRepository,
      userId: input.userId,
      bookingId: input.bookingId,
    });

    const organizationId = booking.getOrganizationId();

    // 2 & 3. 既存評価とステータス・受付期間
    const existingRating = await this.bookingRatingRepository.findByBookingId(
      organizationId,
      input.bookingId,
    );
    const eligibility = evaluateRatingEligibility({
      booking,
      existingRating,
      now: input.now,
    });
    if (!eligibility.ratable && eligibility.code) {
      throw new AppError(
        RATING_DISABLED_STATUS[eligibility.code],
        eligibility.code,
        eligibility.reason ?? "この予約は評価できません",
      );
    }

    // 4. 値の正当性は最後に見る
    let rating: BookingRating;
    try {
      rating = BookingRating.create({
        organizationId,
        bookingId: booking.getBookingId(),
        consultantId: booking.getConsultantId(),
        customerId: booking.getCustomerId(),
        score: input.score,
        comment: input.comment,
        consultedAt: booking.getStartsAt(),
        ratedAt: input.now,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw new AppError(400, error.code, error.message, { cause: error });
      }
      throw error;
    }

    // 5. Doc ID 衝突（二重送信のレース）を 409 に正規化する。
    //    infrastructure は AppError を知らないためここで変換する
    try {
      await this.bookingRatingRepository.create(rating);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === RATING_ALREADY_SUBMITTED
      ) {
        throw new AppError(
          409,
          RATING_ALREADY_SUBMITTED,
          "すでに評価を送信済みです",
          { cause: error },
        );
      }
      throw error;
    }

    return {
      bookingId: rating.getBookingId(),
      score: rating.getScore().getValue(),
      comment: rating.getComment().isEmpty()
        ? null
        : rating.getComment().getValue(),
      ratedAt: rating.getRatedAt(),
    };
  }
}
