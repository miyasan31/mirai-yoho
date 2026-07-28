import { DomainError } from "@mirai-yoho/shared/domain-error";

export const RATING_COMMENT_MAX_LENGTH = 1000;

/**
 * 評価の自由コメント。任意入力のため、空文字を「コメントなし」として扱う。
 */
export class RatingComment {
  private constructor(private readonly value: string) {}

  static create(value: string): RatingComment {
    const normalized = value.trim();
    if (normalized.length > RATING_COMMENT_MAX_LENGTH) {
      throw new DomainError(
        "INVALID_RATING_COMMENT",
        `comment must be ${RATING_COMMENT_MAX_LENGTH} characters or less`,
      );
    }
    return new RatingComment(normalized);
  }

  static reconstruct(value: string): RatingComment {
    return new RatingComment(value);
  }

  static empty(): RatingComment {
    return new RatingComment("");
  }

  getValue(): string {
    return this.value;
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  equals(other: RatingComment): boolean {
    return this.value === other.getValue();
  }
}
