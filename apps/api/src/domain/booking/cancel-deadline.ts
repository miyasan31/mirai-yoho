const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class CancelDeadline {
  private constructor(private readonly deadline: Date) {}

  static create(startsAt: Date): CancelDeadline {
    const jstStartsAtMs = startsAt.getTime() + JST_OFFSET_MS;
    const jstMidnightMs = Math.floor(jstStartsAtMs / DAY_MS) * DAY_MS;
    return new CancelDeadline(new Date(jstMidnightMs - JST_OFFSET_MS));
  }

  static reconstruct(deadline: Date): CancelDeadline {
    return new CancelDeadline(deadline);
  }

  isExpired(now: Date): boolean {
    return now >= this.deadline;
  }

  getValue(): Date {
    return this.deadline;
  }

  equals(other: CancelDeadline): boolean {
    return this.deadline.getTime() === other.deadline.getTime();
  }
}
