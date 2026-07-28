import { DomainError } from "@mirai-yoho/shared/domain-error";
import { describe, expect, it } from "vitest";
import { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import { AppraisalReportContent } from "@/domain/appraisal-report/appraisal-report-content";

function createContent(
  overrides: Partial<Parameters<typeof AppraisalReportContent.create>[0]> = {},
) {
  return AppraisalReportContent.create({
    title: "2026年下半期の運勢",
    customerName: "山田 花子",
    birthDate: "1990-01-01",
    appraisalDate: "2026-07-08",
    theme: "仕事運",
    currentSituation: "転職を検討中",
    result: "秋以降が good タイミング",
    luckyAction: "朝の散歩",
    summary: "焦らず準備を進める",
    ...overrides,
  });
}

function createReport(content = createContent()) {
  return AppraisalReport.create({
    reportId: "report-1",
    organizationId: "org-1",
    bookingId: "booking-1",
    consultantId: "consultant-1",
    customerId: "customer-1",
    content,
  });
}

describe("AppraisalReport", () => {
  it("create は draft 状態で生成する", () => {
    const report = createReport();

    expect(report.getStatus()).toBe("draft");
    expect(report.getPublishedAt()).toBeNull();
    expect(report.isPublished()).toBe(false);
    expect(report.getBookingId()).toBe("booking-1");
    expect(report.getCustomerId()).toBe("customer-1");
  });

  it("draft は内容を更新できる", () => {
    const report = createReport();
    const updated = createContent({ summary: "更新後の総括" });

    report.updateContent(updated);

    expect(report.getContent().getSummary()).toBe("更新後の総括");
  });

  it("publish で published になり publishedAt が入る", () => {
    const report = createReport();
    const publishedAt = new Date("2026-07-09T00:00:00.000Z");

    report.publish(publishedAt);

    expect(report.getStatus()).toBe("published");
    expect(report.isPublished()).toBe(true);
    expect(report.getPublishedAt()).toEqual(publishedAt);
    expect(report.getUpdatedAt()).toEqual(publishedAt);
  });

  it("発行後は内容を更新できない", () => {
    const report = createReport();
    report.publish(new Date());

    expect(() =>
      report.updateContent(createContent({ summary: "後出し" })),
    ).toThrow(DomainError);
  });

  it("二重に発行できない", () => {
    const report = createReport();
    report.publish(new Date());

    expect(() => report.publish(new Date())).toThrow(DomainError);
  });

  it("鑑定結果が空なら発行できない", () => {
    const report = createReport(createContent({ result: "   " }));

    expect(() => report.publish(new Date())).toThrow(DomainError);
    expect(report.getStatus()).toBe("draft");
  });

  it("reconstruct は未知の status を拒否する", () => {
    expect(() =>
      AppraisalReport.reconstruct({
        reportId: "report-1",
        organizationId: "org-1",
        bookingId: "booking-1",
        consultantId: "consultant-1",
        customerId: "customer-1",
        content: createContent(),
        status: "archived",
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow(DomainError);
  });
});
