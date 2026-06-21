import { PricePlanRange } from "@/domain/organization-settings/price-plan-range";

describe("PricePlanRange", () => {
  it("allows the configured 0 to 100000 yen range", () => {
    const range = PricePlanRange.create({
      minTotalJPY: 0,
      maxTotalJPY: 100000,
    });

    expect(range.contains(0)).toBe(true);
    expect(range.contains(100000)).toBe(true);
  });

  it("rejects invalid ranges", () => {
    expect(() =>
      PricePlanRange.create({ minTotalJPY: 100001, maxTotalJPY: 100000 }),
    ).toThrow("100000 or less");
    expect(() =>
      PricePlanRange.create({ minTotalJPY: 5000, maxTotalJPY: 1000 }),
    ).toThrow("Minimum price");
  });
});
