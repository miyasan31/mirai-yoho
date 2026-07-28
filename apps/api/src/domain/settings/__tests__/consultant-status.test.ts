import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  createDefaultConsultantStatuses,
  validateConsultantStatuses,
} from "@/domain/settings/consultant-status";
import { Settings } from "@/domain/settings/settings";

const businessHours = BusinessHours.createDefault().toJSON();

describe("consultant statuses", () => {
  it("creates default consultant status", () => {
    const settings = Settings.createDefault("org-1");

    expect(settings.getConsultantStatuses()).toEqual([
      { statusId: "standard", name: "標準", settlementRatePercent: 30 },
    ]);
    expect(settings.getDefaultConsultantStatusId()).toBe("standard");
  });

  it("restores default statuses for existing settings without status fields", () => {
    const settings = Settings.reconstruct({
      organizationId: "org-1",
      businessHours,
    });

    expect(settings.getConsultantStatuses()).toEqual(
      createDefaultConsultantStatuses(),
    );
    expect(settings.getDefaultConsultantStatusId()).toBe("standard");
  });

  it("rejects empty statuses", () => {
    expect(() => validateConsultantStatuses([], "standard")).toThrow(
      DomainError,
    );
  });

  it("rejects more than five statuses", () => {
    expect(() =>
      validateConsultantStatuses(
        Array.from({ length: 6 }, (_, index) => ({
          statusId: `status-${index}`,
          name: `ステータス${index}`,
        })),
        "status-0",
      ),
    ).toThrow(DomainError);
  });

  it("rejects duplicate status ids", () => {
    expect(() =>
      validateConsultantStatuses(
        [
          { statusId: "standard", name: "標準" },
          { statusId: "standard", name: "標準2" },
        ],
        "standard",
      ),
    ).toThrow(DomainError);
  });

  it("rejects blank status id and name", () => {
    expect(() =>
      validateConsultantStatuses([{ statusId: "", name: "" }], ""),
    ).toThrow(DomainError);
  });

  it("rejects default status outside statuses", () => {
    expect(() =>
      validateConsultantStatuses(
        [{ statusId: "standard", name: "標準" }],
        "premium",
      ),
    ).toThrow(DomainError);
  });

  it("rejects removal of standard status", () => {
    expect(() =>
      validateConsultantStatuses(
        [{ statusId: "premium", name: "プレミアム" }],
        "premium",
      ),
    ).toThrow(DomainError);
  });

  it("allows renaming standard status while keeping the id", () => {
    const result = validateConsultantStatuses(
      [
        {
          statusId: "standard",
          name: "デフォルト",
          settlementRatePercent: 35,
        },
      ],
      "standard",
    );
    expect(result).toEqual([
      { statusId: "standard", name: "デフォルト", settlementRatePercent: 35 },
    ]);
  });

  it("falls back to the default settlement rate for statuses stored before the field existed", () => {
    const result = validateConsultantStatuses(
      [{ statusId: "standard", name: "標準" }],
      "standard",
    );
    expect(result[0].settlementRatePercent).toBe(30);
  });

  it("rejects settlement rates outside 0-100", () => {
    expect(() =>
      validateConsultantStatuses(
        [{ statusId: "standard", name: "標準", settlementRatePercent: 101 }],
        "standard",
      ),
    ).toThrow(DomainError);
    expect(() =>
      validateConsultantStatuses(
        [{ statusId: "standard", name: "標準", settlementRatePercent: -1 }],
        "standard",
      ),
    ).toThrow(DomainError);
  });

  it("rejects fractional settlement rates", () => {
    expect(() =>
      validateConsultantStatuses(
        [{ statusId: "standard", name: "標準", settlementRatePercent: 30.5 }],
        "standard",
      ),
    ).toThrow(DomainError);
  });
});
