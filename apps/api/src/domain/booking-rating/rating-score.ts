import { DomainError } from "@mirai-yoho/shared/domain-error";

const MIN_SCORE = 1;
const MAX_SCORE = 5;

export const RATING_SCORE_VALUES = [1, 2, 3, 4, 5] as const;
export type RatingScoreValue = (typeof RATING_SCORE_VALUES)[number];

export class RatingScore {
  private constructor(private readonly value: RatingScoreValue) {}

  static create(value: number): RatingScore {
    if (!Number.isInteger(value) || value < MIN_SCORE || value > MAX_SCORE) {
      throw new DomainError(
        "INVALID_RATING_SCORE",
        `score must be an integer between ${MIN_SCORE} and ${MAX_SCORE}`,
      );
    }
    return new RatingScore(value as RatingScoreValue);
  }

  static reconstruct(value: number): RatingScore {
    return new RatingScore(value as RatingScoreValue);
  }

  getValue(): RatingScoreValue {
    return this.value;
  }

  equals(other: RatingScore): boolean {
    return this.value === other.getValue();
  }
}
