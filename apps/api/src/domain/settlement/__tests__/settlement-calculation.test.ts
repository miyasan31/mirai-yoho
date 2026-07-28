import { calculateSettlement } from "@/domain/settlement/settlement-calculation";

describe("calculateSettlement", () => {
  it("deducts the system fee with its tax added on top", () => {
    const result = calculateSettlement({
      grossJPY: 110000,
      systemFeeRatePercent: 30,
      usesOfficeAddress: false,
    });

    expect(result).toEqual({
      grossJPY: 110000,
      systemFeeRatePercent: 30,
      systemFeeJPY: 33000,
      systemFeeTaxJPY: 3300,
      officeFeeJPY: 0,
      settlementAmountJPY: 73700,
    });
  });

  it("applies each supported rate", () => {
    const rates = [
      { rate: 30, fee: 33000, tax: 3300, settlement: 73700 },
      { rate: 35, fee: 38500, tax: 3850, settlement: 67650 },
      { rate: 40, fee: 44000, tax: 4400, settlement: 61600 },
    ];

    for (const { rate, fee, tax, settlement } of rates) {
      const result = calculateSettlement({
        grossJPY: 110000,
        systemFeeRatePercent: rate,
        usesOfficeAddress: false,
      });
      expect(result.systemFeeJPY).toBe(fee);
      expect(result.systemFeeTaxJPY).toBe(tax);
      expect(result.settlementAmountJPY).toBe(settlement);
    }
  });

  it("deducts the office fee when the address is used", () => {
    const result = calculateSettlement({
      grossJPY: 110000,
      systemFeeRatePercent: 30,
      usesOfficeAddress: true,
    });

    expect(result.officeFeeJPY).toBe(500);
    expect(result.settlementAmountJPY).toBe(73200);
  });

  it("truncates fractional fees and taxes", () => {
    const result = calculateSettlement({
      grossJPY: 3333,
      systemFeeRatePercent: 35,
      usesOfficeAddress: false,
    });

    // 3333 * 0.35 = 1166.55 -> 1166 / 1166 * 0.1 = 116.6 -> 116
    expect(result.systemFeeJPY).toBe(1166);
    expect(result.systemFeeTaxJPY).toBe(116);
    expect(result.settlementAmountJPY).toBe(2051);
  });

  it("handles a month with no charged bookings", () => {
    const result = calculateSettlement({
      grossJPY: 0,
      systemFeeRatePercent: 40,
      usesOfficeAddress: true,
    });

    expect(result.systemFeeJPY).toBe(0);
    expect(result.systemFeeTaxJPY).toBe(0);
    // 事務所利用料のみが残るため精算料はマイナスになる
    expect(result.settlementAmountJPY).toBe(-500);
  });

  it("rejects out-of-range rates", () => {
    expect(() =>
      calculateSettlement({
        grossJPY: 1000,
        systemFeeRatePercent: 101,
        usesOfficeAddress: false,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_SETTLEMENT_RATE" }),
    );
  });

  it("rejects negative gross amounts", () => {
    expect(() =>
      calculateSettlement({
        grossJPY: -1,
        systemFeeRatePercent: 30,
        usesOfficeAddress: false,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_SETTLEMENT_AMOUNT" }),
    );
  });
});
