import { BusinessHours } from "@/domain/organization-settings/business-hours";
import {
  createDefaultConsultantStatuses,
  validateConsultantStatuses,
} from "@/domain/organization-settings/consultant-status";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { DomainError } from "@/domain/shared/domain-error";

const businessHours = BusinessHours.createDefault().toJSON();

describe("consultant statuses", () => {
  it("creates default consultant status", () => {
    const settings = OrganizationSettings.createDefault("org-1");

    expect(settings.getConsultantStatuses()).toEqual([
      { statusId: "standard", name: "標準" },
    ]);
    expect(settings.getDefaultConsultantStatusId()).toBe("standard");
  });

  it("restores default statuses for existing settings without status fields", () => {
    const settings = OrganizationSettings.reconstruct({
      organizationId: "org-1",
      consultantSelectionEnabled: true,
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
});
