import { normalizePermissions } from "@mirai-yoho/shared/authorization-permission";
import { describe, expect, it } from "vitest";
import { Role } from "@/domain/authorization/role";

describe("authorization permissions", () => {
  it("adds read permissions required by write permissions", () => {
    expect(normalizePermissions(["console.payments.charge"])).toEqual([
      "console.payments.read",
      "console.payments.charge",
    ]);
  });

  it("adds dashboard read dependencies", () => {
    expect(normalizePermissions(["console.dashboard.read"])).toEqual([
      "console.dashboard.read",
      "console.bookings.read",
      "console.payments.read",
      "console.customers.read",
      "console.consultants.read",
    ]);
  });

  it("creates protected admin role with all permissions", () => {
    const role = Role.createSystemAdmin("org-1");

    expect(role.getRoleId()).toBe("admin");
    expect(role.getIsSystem()).toBe(true);
    expect(role.getPermissions()).toContain("console.roles.manage");
    expect(role.getPermissions()).toContain("console.accounts.role.manage");
  });
});
