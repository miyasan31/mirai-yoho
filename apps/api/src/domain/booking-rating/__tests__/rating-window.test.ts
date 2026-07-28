import { RatingWindow } from "@/domain/booking-rating/rating-window";

describe("RatingWindow", () => {
  const endsAt = new Date("2026-04-10T11:00:00Z");
  // endsAt + 30日
  const expiresAt = new Date("2026-05-10T11:00:00Z");

  it("create() は鑑定終了の30日後を期限に設定する", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.getOpensAt().getTime()).toBe(endsAt.getTime());
    expect(window.getExpiresAt().getTime()).toBe(expiresAt.getTime());
  });

  it("hasStarted() は鑑定終了の1ミリ秒前なら false を返す", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.hasStarted(new Date(endsAt.getTime() - 1))).toBe(false);
  });

  it("hasStarted() は鑑定終了時刻ちょうどなら true を返す", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.hasStarted(endsAt)).toBe(true);
  });

  it("isExpired() は期限ちょうどなら false を返す（期限当日は受け付ける）", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.isExpired(expiresAt)).toBe(false);
  });

  it("isExpired() は期限の1ミリ秒後なら true を返す", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.isExpired(new Date(expiresAt.getTime() + 1))).toBe(true);
  });

  it("isOpenAt() は鑑定終了から期限までの間だけ true を返す", () => {
    const window = RatingWindow.create(endsAt);
    expect(window.isOpenAt(new Date(endsAt.getTime() - 1))).toBe(false);
    expect(window.isOpenAt(endsAt)).toBe(true);
    expect(window.isOpenAt(new Date("2026-04-25T00:00:00Z"))).toBe(true);
    expect(window.isOpenAt(expiresAt)).toBe(true);
    expect(window.isOpenAt(new Date(expiresAt.getTime() + 1))).toBe(false);
  });
});
