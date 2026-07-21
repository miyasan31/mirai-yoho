import { DomainError } from "@mirai-yoho/shared/domain-error";

export type CancellationCategoryValue =
  | "before_previous_day"
  | "on_the_day"
  | "no_show";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function startOfJstDay(instant: Date): Date {
  const jstInstant = new Date(instant.getTime() + JST_OFFSET_MS);
  const jstMidnightUtc = Date.UTC(
    jstInstant.getUTCFullYear(),
    jstInstant.getUTCMonth(),
    jstInstant.getUTCDate(),
  );
  return new Date(jstMidnightUtc - JST_OFFSET_MS);
}

export class CancellationCategory {
  private constructor(private readonly value: CancellationCategoryValue) {}

  static forTime(startsAt: Date, now: Date): CancellationCategory {
    const startOfBookingDay = startOfJstDay(startsAt);
    if (now.getTime() < startOfBookingDay.getTime()) {
      return new CancellationCategory("before_previous_day");
    }
    return new CancellationCategory("on_the_day");
  }

  static noShow(): CancellationCategory {
    return new CancellationCategory("no_show");
  }

  static reconstruct(value: string): CancellationCategory {
    if (
      value !== "before_previous_day" &&
      value !== "on_the_day" &&
      value !== "no_show"
    ) {
      throw new DomainError(
        "INVALID_CANCELLATION_CATEGORY",
        `Unknown cancellation category: ${value}`,
      );
    }
    return new CancellationCategory(value);
  }

  getValue(): CancellationCategoryValue {
    return this.value;
  }

  isFree(): boolean {
    return this.value === "before_previous_day";
  }

  computeFeeJPY(bookingTotalJPY: number): number {
    return this.isFree() ? 0 : bookingTotalJPY;
  }

  equals(other: CancellationCategory): boolean {
    return this.value === other.value;
  }
}
