import { AppError } from "@/application/shared/app-error";
import type { BookingRating } from "@/domain/booking-rating/booking-rating";
import type { IBookingRatingRepository } from "@/domain/booking-rating/booking-rating-repository";
import {
  RATING_SCORE_VALUES,
  type RatingScoreValue,
} from "@/domain/booking-rating/rating-score";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

interface ListConsultantRatingsInput {
  organizationId: string;
  consultantId: string;
}

export interface ConsultantRatingSummary {
  count: number;
  /** 小数第2位で丸めた平均。評価0件のときは null */
  averageScore: number | null;
  /** 常に 1〜5 の 5 要素 */
  distribution: { score: RatingScoreValue; count: number }[];
}

export interface ListConsultantRatingsResult {
  summary: ConsultantRatingSummary;
  ratings: BookingRating[];
}

function summarize(ratings: BookingRating[]): ConsultantRatingSummary {
  const countByScore = new Map<RatingScoreValue, number>(
    RATING_SCORE_VALUES.map((score) => [score, 0]),
  );

  let total = 0;
  for (const rating of ratings) {
    const score = rating.getScore().getValue();
    total += score;
    countByScore.set(score, (countByScore.get(score) ?? 0) + 1);
  }

  return {
    count: ratings.length,
    averageScore:
      ratings.length === 0
        ? null
        : Math.round((total / ratings.length) * 100) / 100,
    distribution: RATING_SCORE_VALUES.map((score) => ({
      score,
      count: countByScore.get(score) ?? 0,
    })),
  };
}

export class ListConsultantRatingsUseCase {
  constructor(
    private readonly consultantRepository: IConsultantRepository,
    private readonly bookingRatingRepository: IBookingRatingRepository,
  ) {}

  async execute(
    input: ListConsultantRatingsInput,
  ): Promise<ListConsultantRatingsResult> {
    // テナント越境の遮断も兼ねる
    const consultant = await this.consultantRepository.findById(
      input.organizationId,
      input.consultantId,
    );
    if (!consultant) {
      throw new AppError(404, "CONSULTANT_NOT_FOUND", "Consultant not found");
    }

    // 一覧表示のために全件を取るので、集計はその配列から算術する（追加の読み取りが発生しない）。
    // 1 占い師あたり数千件規模になったら AggregateField.average への移行を検討する。
    const ratings = await this.bookingRatingRepository.findByConsultantId(
      input.organizationId,
      input.consultantId,
    );

    return { summary: summarize(ratings), ratings };
  }
}
