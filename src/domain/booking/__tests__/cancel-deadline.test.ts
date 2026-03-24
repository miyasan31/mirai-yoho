import { describe, expect, it } from "vitest";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";

describe("CancelDeadline", () => {
  const startDatetime = new Date("2026-04-10T10:00:00Z");

  it("create() は開始時刻の24時間前をデッドラインに設定する", () => {
    const deadline = CancelDeadline.create(startDatetime);
    const expected = new Date("2026-04-09T10:00:00Z");
    expect(deadline.getValue().getTime()).toBe(expected.getTime());
  });

  it("isExpired() はデッドライン前なら false を返す", () => {
    const deadline = CancelDeadline.create(startDatetime);
    const beforeDeadline = new Date("2026-04-09T09:59:59Z");
    expect(deadline.isExpired(beforeDeadline)).toBe(false);
  });

  it("isExpired() はデッドライン時刻ちょうどなら true を返す", () => {
    const deadline = CancelDeadline.create(startDatetime);
    const atDeadline = new Date("2026-04-09T10:00:00Z");
    expect(deadline.isExpired(atDeadline)).toBe(true);
  });

  it("isExpired() はデッドライン後なら true を返す", () => {
    const deadline = CancelDeadline.create(startDatetime);
    const afterDeadline = new Date("2026-04-09T10:00:01Z");
    expect(deadline.isExpired(afterDeadline)).toBe(true);
  });

  it("equals() は同じデッドラインで true を返す", () => {
    const d1 = CancelDeadline.create(startDatetime);
    const d2 = CancelDeadline.create(startDatetime);
    expect(d1.equals(d2)).toBe(true);
  });

  it("equals() は異なるデッドラインで false を返す", () => {
    const d1 = CancelDeadline.create(startDatetime);
    const d2 = CancelDeadline.create(new Date("2026-04-11T10:00:00Z"));
    expect(d1.equals(d2)).toBe(false);
  });
});
