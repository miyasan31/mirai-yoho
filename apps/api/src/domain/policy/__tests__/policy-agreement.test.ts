import { DomainError } from "@mirai-yoho/shared/domain-error";
import { PolicyAgreement } from "@/domain/policy/policy-agreement";

const baseProps = {
  agreementId: "agr-1",
  organizationId: "org-1",
  type: "user_terms" as const,
  subjectType: "customer" as const,
  subjectId: "customer-1",
  revisionId: "rev-1",
  version: "2026-08-01",
  agreedVia: "booking" as const,
  bookingId: "booking-1",
};

describe("PolicyAgreement", () => {
  it("create すると agreedAt が現在時刻で入る", () => {
    const before = Date.now();
    const agreement = PolicyAgreement.create(baseProps);
    const after = Date.now();
    const ts = agreement.getAgreedAt().getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("bookingId が省略されると null", () => {
    const agreement = PolicyAgreement.create({
      ...baseProps,
      bookingId: undefined,
    });
    expect(agreement.getBookingId()).toBeNull();
  });

  it("未知の subjectType だと DomainError", () => {
    expect(() =>
      PolicyAgreement.create({ ...baseProps, subjectType: "guest" }),
    ).toThrow(DomainError);
  });

  it("未知の agreedVia だと DomainError", () => {
    expect(() =>
      PolicyAgreement.create({ ...baseProps, agreedVia: "email" }),
    ).toThrow(DomainError);
  });

  it("空の subjectId だと DomainError", () => {
    expect(() =>
      PolicyAgreement.create({ ...baseProps, subjectId: "" }),
    ).toThrow(DomainError);
  });

  it("占い師が利用者向けポリシーに同意しようとすると DomainError", () => {
    expect(() =>
      PolicyAgreement.create({ ...baseProps, subjectType: "consultant" }),
    ).toThrow(DomainError);
  });

  it("顧客が占い師向けポリシーに同意しようとすると DomainError", () => {
    expect(() =>
      PolicyAgreement.create({ ...baseProps, type: "consultant_terms" }),
    ).toThrow(DomainError);
  });

  it("占い師は占い師向けポリシーに同意できる", () => {
    const agreement = PolicyAgreement.create({
      ...baseProps,
      type: "consultant_terms",
      subjectType: "consultant",
      subjectId: "consultant-1",
    });
    expect(agreement.getType()).toBe("consultant_terms");
    expect(agreement.getSubjectType()).toBe("consultant");
  });
});
