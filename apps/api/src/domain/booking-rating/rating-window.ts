const RATING_WINDOW_DAYS = 30;

/**
 * 評価可能期間。鑑定終了時刻（booking.endsAt）から 30 日間。
 *
 * CancelDeadline と違い集約には永続化しない。予約時点のポリシーを固定する必要がなく、
 * booking.endsAt から常に導出できるため。
 */
export class RatingWindow {
  private constructor(
    private readonly opensAt: Date,
    private readonly expiresAt: Date,
  ) {}

  static create(endsAt: Date): RatingWindow {
    const expiresAt = new Date(
      endsAt.getTime() + RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    return new RatingWindow(endsAt, expiresAt);
  }

  /** 鑑定が終了しているか（now >= endsAt） */
  hasStarted(now: Date): boolean {
    return now.getTime() >= this.opensAt.getTime();
  }

  /** 受付期限を過ぎているか（now > endsAt + 30日） */
  isExpired(now: Date): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }

  isOpenAt(now: Date): boolean {
    return this.hasStarted(now) && !this.isExpired(now);
  }

  getOpensAt(): Date {
    return this.opensAt;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }
}
