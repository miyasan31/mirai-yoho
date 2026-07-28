import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { Settings } from "@/domain/settings/settings";

const ORGANIZATION_ID = "org-1";

describe("Settings の監査フィールド", () => {
  it("reconstruct は保存済みの createdAt / updatedAt を保持する", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-02-01T00:00:00.000Z");

    const settings = Settings.reconstruct({
      organizationId: ORGANIZATION_ID,
      businessHours: BusinessHours.createDefault().toJSON(),
      createdAt,
      updatedAt,
    });

    expect(settings.getCreatedAt()).toEqual(createdAt);
    expect(settings.getUpdatedAt()).toEqual(updatedAt);
  });

  it("更新しても createdAt は変わらず updatedAt だけ進む", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const settings = Settings.reconstruct({
      organizationId: ORGANIZATION_ID,
      businessHours: BusinessHours.createDefault().toJSON(),
      createdAt,
      updatedAt: createdAt,
    });

    settings.updatePricePlanRange({ minTotalJPY: 1000, maxTotalJPY: 20000 });

    expect(settings.getCreatedAt()).toEqual(createdAt);
    expect(settings.getUpdatedAt().getTime()).toBeGreaterThan(
      createdAt.getTime(),
    );
  });

  it("監査フィールドを持たない旧ドキュメントでも reconstruct できる", () => {
    const settings = Settings.reconstruct({
      organizationId: ORGANIZATION_ID,
      businessHours: BusinessHours.createDefault().toJSON(),
    });

    expect(settings.getCreatedAt()).toEqual(new Date(0));
    expect(settings.getUpdatedAt()).toEqual(new Date(0));
  });

  it("createDefault は createdAt / updatedAt を現在時刻で初期化する", () => {
    const before = Date.now();
    const settings = Settings.createDefault(ORGANIZATION_ID);

    expect(settings.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before);
    expect(settings.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before);
  });
});
