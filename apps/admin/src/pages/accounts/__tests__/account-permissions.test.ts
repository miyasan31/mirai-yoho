import {
  canDeleteAdminAccount,
  canEditDisplayName,
  canEditRole,
  canInviteAdminAccounts,
  canManageAdminAccounts,
  canResendInvite,
  canResetPassword,
} from "../account-permissions";

describe("account permissions", () => {
  it("allows any assigned roleId to access account management and invite", () => {
    expect(canManageAdminAccounts("admin")).toBe(true);
    expect(canManageAdminAccounts("operator")).toBe(true);
    expect(canManageAdminAccounts("custom-role")).toBe(true);
    expect(canManageAdminAccounts(null)).toBe(false);
    expect(canInviteAdminAccounts("admin")).toBe(true);
    expect(canInviteAdminAccounts("operator")).toBe(true);
  });

  it("allows non-admin roles to edit display name only for self", () => {
    expect(canEditDisplayName("admin", "admin-1", "target-1")).toBe(true);
    expect(canEditDisplayName("operator", "operator-1", "operator-1")).toBe(
      true,
    );
    expect(canEditDisplayName("operator", "operator-1", "operator-2")).toBe(
      false,
    );
  });

  it("limits role change to system admin and requires target to be active", () => {
    expect(canEditRole("admin", "active")).toBe(true);
    expect(canEditRole("admin", "invited")).toBe(false);
    expect(canEditRole("admin", "disabled")).toBe(false);
    expect(canEditRole("operator", "active")).toBe(false);
    expect(canDeleteAdminAccount("admin")).toBe(true);
    expect(canDeleteAdminAccount("operator")).toBe(true);
  });

  it("allows resend invite only for invited accounts and reset password only for active accounts", () => {
    expect(canResendInvite("admin", "invited")).toBe(true);
    expect(canResendInvite("operator", "invited")).toBe(true);
    expect(canResendInvite("operator", "active")).toBe(false);

    expect(canResetPassword("admin", "active")).toBe(true);
    expect(canResetPassword("operator", "active")).toBe(true);
    expect(canResetPassword("operator", "invited")).toBe(false);
  });
});
