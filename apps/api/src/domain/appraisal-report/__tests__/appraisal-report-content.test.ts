import { DomainError } from "@mirai-yoho/shared/domain-error";
import { describe, expect, it } from "vitest";
import { AppraisalReportContent } from "@/domain/appraisal-report/appraisal-report-content";

const baseProps = {
  title: "2026年下半期の運勢",
  customerName: "山田 花子",
  birthDate: "1990-01-01",
  appraisalDate: "2026-07-08",
  theme: "仕事運",
  currentSituation: "転職を検討中",
  result: "秋以降に good タイミング",
  luckyAction: "朝の散歩",
  summary: "焦らず準備を進める",
};

describe("AppraisalReportContent", () => {
  it("全項目を保持して生成できる", () => {
    const content = AppraisalReportContent.create(baseProps);

    expect(content.getTitle()).toBe("2026年下半期の運勢");
    expect(content.getCustomerName()).toBe("山田 花子");
    expect(content.getBirthDate()).toBe("1990-01-01");
    expect(content.getAppraisalDate()).toBe("2026-07-08");
    expect(content.getTheme()).toBe("仕事運");
    expect(content.getCurrentSituation()).toBe("転職を検討中");
    expect(content.getResult()).toBe("秋以降に good タイミング");
    expect(content.getLuckyAction()).toBe("朝の散歩");
    expect(content.getSummary()).toBe("焦らず準備を進める");
  });

  it("empty はすべて空文字で生成する", () => {
    const content = AppraisalReportContent.empty();

    expect(content.getTitle()).toBe("");
    expect(content.getResult()).toBe("");
    expect(content.getSummary()).toBe("");
  });

  it("生年月日・鑑定日は空文字を許容する", () => {
    const content = AppraisalReportContent.create({
      ...baseProps,
      birthDate: "",
      appraisalDate: "",
    });

    expect(content.getBirthDate()).toBe("");
    expect(content.getAppraisalDate()).toBe("");
  });

  it("生年月日が YYYY-MM-DD 形式でなければ DomainError", () => {
    expect(() =>
      AppraisalReportContent.create({ ...baseProps, birthDate: "1990/01/01" }),
    ).toThrow(DomainError);
  });

  it("鑑定日が実在しない日付なら DomainError", () => {
    expect(() =>
      AppraisalReportContent.create({
        ...baseProps,
        appraisalDate: "2026-02-30",
      }),
    ).toThrow(DomainError);
  });

  it("タイトルが 120 文字を超えると DomainError", () => {
    expect(() =>
      AppraisalReportContent.create({ ...baseProps, title: "あ".repeat(121) }),
    ).toThrow(DomainError);
  });

  it("セクション本文が 10,000 文字を超えると DomainError", () => {
    expect(() =>
      AppraisalReportContent.create({
        ...baseProps,
        result: "あ".repeat(10_001),
      }),
    ).toThrow(DomainError);
  });

  it("reconstruct はバリデーションせず復元する", () => {
    const content = AppraisalReportContent.reconstruct({
      ...baseProps,
      birthDate: "1990/01/01",
    });

    expect(content.getBirthDate()).toBe("1990/01/01");
  });

  it("equals は全項目が一致するとき true", () => {
    expect(
      AppraisalReportContent.create(baseProps).equals(
        AppraisalReportContent.create(baseProps),
      ),
    ).toBe(true);
    expect(
      AppraisalReportContent.create(baseProps).equals(
        AppraisalReportContent.create({ ...baseProps, summary: "別の総括" }),
      ),
    ).toBe(false);
  });
});
