import { DomainError } from "@mirai-yoho/shared/domain-error";
import { PolicyRevision } from "@/domain/policy/policy-revision";

const baseProps = {
  revisionId: "rev-1",
  organizationId: "org-1",
  type: "user_terms" as const,
  version: "2026-08-01",
  title: "利用規約",
  body: "# 利用規約\n\n本文",
  createdBy: "account-1",
};

describe("PolicyRevision", () => {
  describe("create", () => {
    it("初期状態は draft", () => {
      const revision = PolicyRevision.create(baseProps);
      expect(revision.getStatus()).toBe("draft");
      expect(revision.getEffectiveFrom()).toBeNull();
      expect(revision.getPublishedAt()).toBeNull();
    });

    it("version が空だと DomainError", () => {
      expect(() =>
        PolicyRevision.create({ ...baseProps, version: "  " }),
      ).toThrow(DomainError);
    });

    it("title が空だと DomainError", () => {
      expect(() => PolicyRevision.create({ ...baseProps, title: "" })).toThrow(
        DomainError,
      );
    });

    it("未知の type だと DomainError", () => {
      expect(() =>
        PolicyRevision.create({ ...baseProps, type: "unknown" }),
      ).toThrow(DomainError);
    });
  });

  describe("updateDraft", () => {
    it("draft の body を更新できる", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.updateDraft({ body: "更新された本文" });
      expect(revision.getBody()).toBe("更新された本文");
    });

    it("published 版は更新できない", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.publish(new Date("2026-08-01T00:00:00+09:00"));
      expect(() => revision.updateDraft({ body: "hoge" })).toThrow(DomainError);
    });
  });

  describe("publish", () => {
    it("draft を published にできる", () => {
      const revision = PolicyRevision.create(baseProps);
      const effectiveFrom = new Date("2026-08-01T00:00:00+09:00");
      revision.publish(effectiveFrom);
      expect(revision.getStatus()).toBe("published");
      expect(revision.getEffectiveFrom()).toEqual(effectiveFrom);
      expect(revision.getPublishedAt()).toBeInstanceOf(Date);
    });

    it("body が空だと publish 不可", () => {
      const revision = PolicyRevision.create({ ...baseProps, body: "   " });
      expect(() =>
        revision.publish(new Date("2026-08-01T00:00:00+09:00")),
      ).toThrow(DomainError);
    });

    it("published 版を再度 publish しようとすると DomainError", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.publish(new Date("2026-08-01T00:00:00+09:00"));
      expect(() =>
        revision.publish(new Date("2026-08-02T00:00:00+09:00")),
      ).toThrow(DomainError);
    });
  });

  describe("archive", () => {
    it("published 版を archived にできる", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.publish(new Date("2026-08-01T00:00:00+09:00"));
      revision.archive();
      expect(revision.getStatus()).toBe("archived");
      expect(revision.getArchivedAt()).toBeInstanceOf(Date);
    });

    it("draft は archive できない", () => {
      const revision = PolicyRevision.create(baseProps);
      expect(() => revision.archive()).toThrow(DomainError);
    });
  });

  describe("isEffectiveAt", () => {
    it("effectiveFrom 前は false", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.publish(new Date("2026-08-01T00:00:00+09:00"));
      expect(
        revision.isEffectiveAt(new Date("2026-07-31T23:00:00+09:00")),
      ).toBe(false);
    });

    it("effectiveFrom 以降は true", () => {
      const revision = PolicyRevision.create(baseProps);
      revision.publish(new Date("2026-08-01T00:00:00+09:00"));
      expect(
        revision.isEffectiveAt(new Date("2026-08-01T00:00:00+09:00")),
      ).toBe(true);
    });

    it("draft は常に false", () => {
      const revision = PolicyRevision.create(baseProps);
      expect(revision.isEffectiveAt(new Date("2027-01-01"))).toBe(false);
    });
  });
});
