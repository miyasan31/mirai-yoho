import {
  isWithinSettlementPeriod,
  resolveSettlementPeriod,
} from "@/domain/settlement/settlement-period";

describe("resolveSettlementPeriod", () => {
  it("returns the JST month boundaries as UTC instants", () => {
    const period = resolveSettlementPeriod("2026-07");

    // 2026-07-01 00:00 JST = 2026-06-30 15:00 UTC
    expect(period.startsAt.toISOString()).toBe("2026-06-30T15:00:00.000Z");
    // 2026-08-01 00:00 JST = 2026-07-31 15:00 UTC
    expect(period.endsAt.toISOString()).toBe("2026-07-31T15:00:00.000Z");
  });

  it("crosses the year boundary", () => {
    const period = resolveSettlementPeriod("2026-12");

    expect(period.startsAt.toISOString()).toBe("2026-11-30T15:00:00.000Z");
    expect(period.endsAt.toISOString()).toBe("2026-12-31T15:00:00.000Z");
  });

  it("rejects malformed months", () => {
    expect(() => resolveSettlementPeriod("2026-7")).toThrowError(
      expect.objectContaining({ code: "INVALID_SETTLEMENT_MONTH" }),
    );
    expect(() => resolveSettlementPeriod("2026-13")).toThrowError(
      expect.objectContaining({ code: "INVALID_SETTLEMENT_MONTH" }),
    );
  });
});

describe("isWithinSettlementPeriod", () => {
  const period = resolveSettlementPeriod("2026-07");

  it("includes a booking starting at 00:00 JST on the first day", () => {
    expect(
      isWithinSettlementPeriod(period, new Date("2026-06-30T15:00:00.000Z")),
    ).toBe(true);
  });

  it("includes a booking starting at 23:59 JST on the last day", () => {
    // 2026-07-31 23:59 JST
    expect(
      isWithinSettlementPeriod(period, new Date("2026-07-31T14:59:00.000Z")),
    ).toBe(true);
  });

  it("excludes a booking starting at 00:00 JST of the next month", () => {
    expect(
      isWithinSettlementPeriod(period, new Date("2026-07-31T15:00:00.000Z")),
    ).toBe(false);
  });

  it("excludes a booking starting just before the month", () => {
    expect(
      isWithinSettlementPeriod(period, new Date("2026-06-30T14:59:59.999Z")),
    ).toBe(false);
  });
});
