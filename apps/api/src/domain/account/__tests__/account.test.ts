import { DomainError } from "@mirai-yoho/shared/domain-error";
import { describe, expect, it } from "vitest";
import { Account } from "@/domain/account/account";

describe("Account", () => {
  describe("invite", () => {
    it("creates an account with status=invited", () => {
      const account = Account.invite({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        name: "太郎",
      });
      expect(account.getStatus()).toBe("invited");
      expect(account.getOrganizationId()).toBe("org-1");
      expect(account.getAccountId()).toBe("acc-1");
      expect(account.getRoleId()).toBe("admin");
      expect(account.getName()).toBe("太郎");
    });

    it("normalizes an empty name to null", () => {
      const account = Account.invite({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        name: "   ",
      });
      expect(account.getName()).toBeNull();
    });
  });

  describe("activate", () => {
    it("transitions from invited to active and updates updatedAt", async () => {
      const account = Account.reconstruct({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        status: "invited",
        name: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });
      const before = account.getUpdatedAt().getTime();
      await new Promise((resolve) => setTimeout(resolve, 5));

      account.activate();

      expect(account.getStatus()).toBe("active");
      expect(account.getUpdatedAt().getTime()).toBeGreaterThan(before);
    });

    it("throws DomainError when already active", () => {
      const account = Account.reconstruct({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        status: "active",
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(() => account.activate()).toThrow(DomainError);
    });
  });

  describe("changeRole", () => {
    it("updates roleId and updatedAt", async () => {
      const account = Account.reconstruct({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        status: "active",
        name: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });
      const before = account.getUpdatedAt().getTime();
      await new Promise((resolve) => setTimeout(resolve, 5));

      account.changeRole("operator");

      expect(account.getRoleId()).toBe("operator");
      expect(account.getUpdatedAt().getTime()).toBeGreaterThan(before);
    });
  });

  describe("updateName", () => {
    it("normalizes trimmed name", () => {
      const account = Account.invite({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        name: "太郎",
      });
      account.updateName("  次郎  ");
      expect(account.getName()).toBe("次郎");
    });

    it("normalizes empty name to null", () => {
      const account = Account.invite({
        organizationId: "org-1",
        accountId: "acc-1",
        roleId: "admin",
        name: "太郎",
      });
      account.updateName("");
      expect(account.getName()).toBeNull();
    });
  });
});
