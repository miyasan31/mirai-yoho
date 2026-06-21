import { BusinessHours } from "@/domain/organization-settings/business-hours";
import {
  createDefaultConsultantRanks,
  validateConsultantRanks,
} from "@/domain/organization-settings/consultant-rank";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { DomainError } from "@/domain/shared/domain-error";

const businessHours = BusinessHours.createDefault().toJSON();

describe("consultant ranks", () => {
  it("creates default consultant rank", () => {
    const settings = OrganizationSettings.createDefault("org-1");

    expect(settings.getConsultantRanks()).toEqual([
      { rankId: "standard", name: "標準" },
    ]);
    expect(settings.getDefaultConsultantRankId()).toBe("standard");
  });

  it("restores default ranks for existing settings without rank fields", () => {
    const settings = OrganizationSettings.reconstruct({
      organizationId: "org-1",
      consultantSelectionEnabled: true,
      businessHours,
    });

    expect(settings.getConsultantRanks()).toEqual(
      createDefaultConsultantRanks(),
    );
    expect(settings.getDefaultConsultantRankId()).toBe("standard");
  });

  it("rejects empty ranks", () => {
    expect(() => validateConsultantRanks([], "standard")).toThrow(DomainError);
  });

  it("rejects more than five ranks", () => {
    expect(() =>
      validateConsultantRanks(
        Array.from({ length: 6 }, (_, index) => ({
          rankId: `rank-${index}`,
          name: `ランク${index}`,
        })),
        "rank-0",
      ),
    ).toThrow(DomainError);
  });

  it("rejects duplicate rank ids", () => {
    expect(() =>
      validateConsultantRanks(
        [
          { rankId: "standard", name: "標準" },
          { rankId: "standard", name: "標準2" },
        ],
        "standard",
      ),
    ).toThrow(DomainError);
  });

  it("rejects blank rank id and name", () => {
    expect(() =>
      validateConsultantRanks([{ rankId: "", name: "" }], ""),
    ).toThrow(DomainError);
  });

  it("rejects default rank outside ranks", () => {
    expect(() =>
      validateConsultantRanks(
        [{ rankId: "standard", name: "標準" }],
        "premium",
      ),
    ).toThrow(DomainError);
  });
});
