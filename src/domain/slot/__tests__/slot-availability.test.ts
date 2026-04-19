import {
  getSlotUnitMinutes,
  isAlignedToSlotBoundary,
  isValidSlotRange,
  splitIntoSlotRanges,
} from "@/domain/slot/slot-availability";

describe("slot-availability", () => {
  it("30分単位を返す", () => {
    expect(getSlotUnitMinutes()).toBe(30);
  });

  it("30分境界の時刻を判定できる", () => {
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:00:00Z"))).toBe(
      true,
    );
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:30:00Z"))).toBe(
      true,
    );
    expect(isAlignedToSlotBoundary(new Date("2026-05-01T10:15:00Z"))).toBe(
      false,
    );
  });

  it("30分ちょうどの枠のみ有効と判定する", () => {
    expect(
      isValidSlotRange(
        new Date("2026-05-01T10:00:00Z"),
        new Date("2026-05-01T10:30:00Z"),
      ),
    ).toBe(true);

    expect(
      isValidSlotRange(
        new Date("2026-05-01T10:00:00Z"),
        new Date("2026-05-01T11:00:00Z"),
      ),
    ).toBe(false);

    expect(
      isValidSlotRange(
        new Date("2026-05-01T10:15:00Z"),
        new Date("2026-05-01T10:45:00Z"),
      ),
    ).toBe(false);
  });

  it("選択範囲を30分枠へ分割する", () => {
    const ranges = splitIntoSlotRanges(
      new Date("2026-05-01T10:00:00Z"),
      new Date("2026-05-01T11:30:00Z"),
    );

    expect(ranges).toHaveLength(3);
    expect(ranges[0]).toEqual({
      start: new Date("2026-05-01T10:00:00Z"),
      end: new Date("2026-05-01T10:30:00Z"),
    });
    expect(ranges[2]).toEqual({
      start: new Date("2026-05-01T11:00:00Z"),
      end: new Date("2026-05-01T11:30:00Z"),
    });
  });
});
