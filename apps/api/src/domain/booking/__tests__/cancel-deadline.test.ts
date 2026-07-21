import { CancelDeadline } from "@/domain/booking/cancel-deadline";

describe("CancelDeadline", () => {
  // 2026-04-10 10:00 JST = 2026-04-10 01:00 UTC
  const startsAt = new Date("2026-04-10T01:00:00Z");
  // 2026-04-10 00:00 JST = 2026-04-09 15:00 UTC
  const expectedDeadline = new Date("2026-04-09T15:00:00Z");

  it("create() は開始時刻の JST 当日 0:00 をデッドラインに設定する", () => {
    const deadline = CancelDeadline.create(startsAt);
    expect(deadline.getValue().getTime()).toBe(expectedDeadline.getTime());
  });

  it("isExpired() は前日 23:59:59 JST では false を返す", () => {
    const deadline = CancelDeadline.create(startsAt);
    // 前日 23:59:59 JST = 2026-04-09 14:59:59 UTC
    const previousDayEnd = new Date("2026-04-09T14:59:59Z");
    expect(deadline.isExpired(previousDayEnd)).toBe(false);
  });

  it("isExpired() は当日 0:00 JST ちょうどで true を返す", () => {
    const deadline = CancelDeadline.create(startsAt);
    expect(deadline.isExpired(expectedDeadline)).toBe(true);
  });

  it("isExpired() は当日 8:00 JST では true を返す", () => {
    const deadline = CancelDeadline.create(startsAt);
    // 当日 8:00 JST = 2026-04-09 23:00 UTC
    const sameDayMorning = new Date("2026-04-09T23:00:00Z");
    expect(deadline.isExpired(sameDayMorning)).toBe(true);
  });

  it("開始時刻が JST 深夜（0:30）でも前日基準で計算する", () => {
    // 2026-04-10 00:30 JST = 2026-04-09 15:30 UTC
    const midnight = new Date("2026-04-09T15:30:00Z");
    const deadline = CancelDeadline.create(midnight);
    // Deadline は 2026-04-10 00:00 JST = 2026-04-09 15:00 UTC
    expect(deadline.getValue().getTime()).toBe(
      new Date("2026-04-09T15:00:00Z").getTime(),
    );
  });

  it("equals() は同じデッドラインで true を返す", () => {
    const d1 = CancelDeadline.create(startsAt);
    const d2 = CancelDeadline.create(startsAt);
    expect(d1.equals(d2)).toBe(true);
  });

  it("equals() は異なるデッドラインで false を返す", () => {
    const d1 = CancelDeadline.create(startsAt);
    const d2 = CancelDeadline.create(new Date("2026-04-11T01:00:00Z"));
    expect(d1.equals(d2)).toBe(false);
  });
});
