const CANCEL_DEADLINE_HOURS = 24;

export class CancelDeadline {
  private constructor(private readonly deadline: Date) {}

  static create(startDatetime: Date): CancelDeadline {
    const deadline = new Date(startDatetime.getTime() - CANCEL_DEADLINE_HOURS * 60 * 60 * 1000);
    return new CancelDeadline(deadline);
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
