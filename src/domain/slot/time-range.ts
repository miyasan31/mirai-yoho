import { DomainError } from "@/domain/shared/domain-error";

export class TimeRange {
  private constructor(
    private readonly startAt: Date,
    private readonly endAt: Date,
  ) {}

  static create(startAt: Date, endAt: Date): TimeRange {
    if (startAt >= endAt) {
      throw new DomainError(
        "INVALID_TIME_RANGE",
        "startAt must be before endAt",
      );
    }
    if (startAt < new Date()) {
      throw new DomainError(
        "PAST_TIME_RANGE",
        "startAt must not be in the past",
      );
    }
    return new TimeRange(startAt, endAt);
  }

  static reconstruct(startAt: Date, endAt: Date): TimeRange {
    return new TimeRange(startAt, endAt);
  }

  getStartAt(): Date {
    return this.startAt;
  }

  getEndAt(): Date {
    return this.endAt;
  }

  overlaps(other: TimeRange): boolean {
    return this.startAt < other.endAt && other.startAt < this.endAt;
  }

  equals(other: TimeRange): boolean {
    return (
      this.startAt.getTime() === other.startAt.getTime() &&
      this.endAt.getTime() === other.endAt.getTime()
    );
  }
}
