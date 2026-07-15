import { PricePlan } from "@/domain/price-plan/price-plan";

function createPricePlan() {
  return PricePlan.create({
    organizationId: "org-1",
    consultantId: "consultant-1",
    pricePlanId: "plan-1",
    name: " 通常  鑑定 ",
    totalJPY: 5000,
  });
}

describe("PricePlan", () => {
  it("normalizes the name signature and keeps the amount immutable", () => {
    const pricePlan = createPricePlan();

    expect(pricePlan.getName()).toBe("通常 鑑定");
    expect(pricePlan.getNormalizedName()).toBe("通常 鑑定");
    expect(pricePlan.getTotalJPY()).toBe(5000);
    expect("changeAmount" in pricePlan).toBe(false);
  });

  it("supports archive and unarchive", () => {
    const pricePlan = createPricePlan();

    pricePlan.archive();
    expect(pricePlan.isActive()).toBe(false);
    expect(pricePlan.getArchivedAt()).toBeInstanceOf(Date);

    pricePlan.unarchive();
    expect(pricePlan.isActive()).toBe(true);
    expect(pricePlan.getArchivedAt()).toBeUndefined();
  });
});
