import {
  getBookingBufferMinutes,
  getBufferSlotCount,
  getSlotUnitMinutes,
  getUsageSlotCount,
  isAlignedToSlotBoundary,
  isSupportedDuration,
  isValidBookingRange,
  isValidMinimalSlotRange,
  SUPPORTED_DURATION_MINUTES,
  splitIntoSlotRanges,
} from "@mirai-yoho/shared/slot-availability";

describe("slot-availability", () => {
  it("15分単位を返す", () => {
    expect(getSlotUnitMinutes()).toBe(15);
  });

  it("準備時間 15 分と 1 Slot を返す", () => {
    expect(getBookingBufferMinutes()).toBe(15);
    expect(getBufferSlotCount()).toBe(1);
  });

  it("サポート予約時間は 30/60/90/120 分", () => {
    expect([...SUPPORTED_DURATION_MINUTES]).toEqual([30, 60, 90, 120]);
    expect(isSupportedDuration(30)).toBe(true);
    expect(isSupportedDuration(45)).toBe(false);
    expect(isSupportedDuration(120)).toBe(true);
    expect(isSupportedDuration(150)).toBe(false);
  });

  it("15 分境界の時刻を判定できる", () => {
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:00:00Z"))).toBe(
      true,
    );
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:15:00Z"))).toBe(
      true,
    );
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:30:00Z"))).toBe(
      true,
    );
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:07:00Z"))).toBe(
      false,
    );
  });

  it("15 分ちょうどの枠のみ minimalSlotRange として有効", () => {
    expect(
      isValidMinimalSlotRange(
        new Date("2026-05-01T10:00:00Z"),
        new Date("2026-05-01T10:15:00Z"),
      ),
    ).toBe(true);

    expect(
      isValidMinimalSlotRange(
        new Date("2026-05-01T10:00:00Z"),
        new Date("2026-05-01T10:30:00Z"),
      ),
    ).toBe(false);

    expect(
      isValidMinimalSlotRange(
        new Date("2026-05-01T10:07:00Z"),
        new Date("2026-05-01T10:22:00Z"),
      ),
    ).toBe(false);
  });

  it("予約レンジは 15 分アライン + サポート duration のみ有効", () => {
    expect(isValidBookingRange(new Date("2026-05-01T10:15:00Z"), 60)).toBe(
      true,
    );
    expect(isValidBookingRange(new Date("2026-05-01T10:00:00Z"), 120)).toBe(
      true,
    );
    expect(isValidBookingRange(new Date("2026-05-01T10:07:00Z"), 60)).toBe(
      false,
    );
    expect(isValidBookingRange(new Date("2026-05-01T10:00:00Z"), 45)).toBe(
      false,
    );
  });

  it("duration から usage slot 数を算出できる", () => {
    expect(getUsageSlotCount(30)).toBe(2);
    expect(getUsageSlotCount(60)).toBe(4);
    expect(getUsageSlotCount(90)).toBe(6);
    expect(getUsageSlotCount(120)).toBe(8);
  });

  it("選択範囲を 15 分枠へ分割する", () => {
    const ranges = splitIntoSlotRanges(
      new Date("2026-05-01T10:00:00Z"),
      new Date("2026-05-01T11:00:00Z"),
    );

    expect(ranges).toHaveLength(4);
    expect(ranges[0]).toEqual({
      start: new Date("2026-05-01T10:00:00Z"),
      end: new Date("2026-05-01T10:15:00Z"),
    });
    expect(ranges[3]).toEqual({
      start: new Date("2026-05-01T10:45:00Z"),
      end: new Date("2026-05-01T11:00:00Z"),
    });
  });
});
