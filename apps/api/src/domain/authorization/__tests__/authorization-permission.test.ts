import { normalizePermissions } from "@mirai-yoho/shared/authorization-permission";
import { describe, expect, it } from "vitest";
import { Role } from "@/domain/authorization/role";

describe("authorization permissions", () => {
  it("adds read permissions required by write permissions", () => {
    expect(normalizePermissions(["admin.payments.charge"])).toEqual([
      "admin.payments.read",
      "admin.payments.charge",
    ]);
  });

  it("adds dashboard read dependencies", () => {
    expect(normalizePermissions(["admin.dashboard.read"])).toEqual([
      "admin.dashboard.read",
      "admin.bookings.read",
      "admin.payments.read",
      "admin.customers.read",
      "admin.consultants.read",
    ]);
  });

  it("creates protected admin role with all permissions", () => {
    const role = Role.createSystemAdmin("org-1");

    expect(role.getRoleId()).toBe("admin");
    expect(role.getIsSystem()).toBe(true);
    expect(role.getPermissions()).toContain("admin.roles.manage");
    expect(role.getPermissions()).toContain("admin.accounts.role.manage");
  });
});
