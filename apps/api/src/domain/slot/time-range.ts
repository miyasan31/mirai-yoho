import { DomainError } from "@mirai-yoho/shared/domain-error";

export class TimeRange {
  private constructor(
    private readonly startsAt: Date,
    private readonly endsAt: Date,
  ) {}

  static create(startsAt: Date, endsAt: Date): TimeRange {
    if (startsAt >= endsAt) {
      throw new DomainError(
        "INVALID_TIME_RANGE",
        "startsAt must be before endsAt",
      );
    }
    if (startsAt < new Date()) {
      throw new DomainError(
        "PAST_TIME_RANGE",
        "startsAt must not be in the past",
      );
    }
    return new TimeRange(startsAt, endsAt);
  }

  static reconstruct(startsAt: Date, endsAt: Date): TimeRange {
    return new TimeRange(startsAt, endsAt);
  }

  getStartsAt(): Date {
    return this.startsAt;
  }

  getEndsAt(): Date {
    return this.endsAt;
  }

  overlaps(other: TimeRange): boolean {
    return this.startsAt < other.endsAt && other.startsAt < this.endsAt;
  }

  equals(other: TimeRange): boolean {
    return (
      this.startsAt.getTime() === other.startsAt.getTime() &&
      this.endsAt.getTime() === other.endsAt.getTime()
    );
  }
}
