import { DomainError } from "@mirai-yoho/shared/domain-error";
import { describe, expect, it } from "vitest";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";

describe("ConsultantMemo", () => {
  it("4項目を保持して生成できる", () => {
    const memo = ConsultantMemo.create({
      customerName: "山田 花子",
      birthDate: "1990-01-01",
      appraisalDate: "2026-07-08",
      freeMemo: "初回鑑定",
    });

    expect(memo.getCustomerName()).toBe("山田 花子");
    expect(memo.getBirthDate()).toBe("1990-01-01");
    expect(memo.getAppraisalDate()).toBe("2026-07-08");
    expect(memo.getFreeMemo()).toBe("初回鑑定");
  });

  it("empty はすべて空文字で生成する", () => {
    const memo = ConsultantMemo.empty();

    expect(memo.getCustomerName()).toBe("");
    expect(memo.getBirthDate()).toBe("");
    expect(memo.getAppraisalDate()).toBe("");
    expect(memo.getFreeMemo()).toBe("");
  });

  it("生年月日・鑑定日は空文字を許容する", () => {
    const memo = ConsultantMemo.create({
      customerName: "山田 花子",
      birthDate: "",
      appraisalDate: "",
      freeMemo: "",
    });

    expect(memo.getBirthDate()).toBe("");
    expect(memo.getAppraisalDate()).toBe("");
  });

  it("生年月日が YYYY-MM-DD 形式でなければ DomainError", () => {
    expect(() =>
      ConsultantMemo.create({
        customerName: "",
        birthDate: "1990/01/01",
        appraisalDate: "",
        freeMemo: "",
      }),
    ).toThrow(DomainError);
  });

  it("鑑定日が実在しない日付なら DomainError", () => {
    expect(() =>
      ConsultantMemo.create({
        customerName: "",
        birthDate: "",
        appraisalDate: "2026-02-30",
        freeMemo: "",
      }),
    ).toThrow(DomainError);
  });

  it("equals は全項目が一致するとき true", () => {
    const props = {
      customerName: "山田 花子",
      birthDate: "1990-01-01",
      appraisalDate: "2026-07-08",
      freeMemo: "初回鑑定",
    };

    expect(
      ConsultantMemo.create(props).equals(ConsultantMemo.create(props)),
    ).toBe(true);
    expect(
      ConsultantMemo.create(props).equals(
        ConsultantMemo.create({ ...props, freeMemo: "別のメモ" }),
      ),
    ).toBe(false);
  });
});
