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
  it("allows admin and operator to access account management and invite", () => {
    expect(canManageAdminAccounts("admin")).toBe(true);
    expect(canManageAdminAccounts("operator")).toBe(true);
    expect(canManageAdminAccounts(null)).toBe(false);
    expect(canInviteAdminAccounts("admin")).toBe(true);
    expect(canInviteAdminAccounts("operator")).toBe(true);
  });

  it("allows operator display name edit only for self", () => {
    expect(canEditDisplayName("admin", "admin-1", "target-1")).toBe(true);
    expect(canEditDisplayName("operator", "operator-1", "operator-1")).toBe(
      true,
    );
    expect(canEditDisplayName("operator", "operator-1", "operator-2")).toBe(
      false,
    );
  });

  it("limits role change and delete to admin", () => {
    expect(canEditRole("admin", "registered")).toBe(true);
    expect(canEditRole("admin", "pending")).toBe(false);
    expect(canEditRole("operator", "registered")).toBe(false);
    expect(canDeleteAdminAccount("admin")).toBe(true);
    expect(canDeleteAdminAccount("operator")).toBe(false);
  });

  it("allows resend invite only for pending accounts and reset password only for registered accounts", () => {
    expect(canResendInvite("admin", "pending")).toBe(true);
    expect(canResendInvite("operator", "pending")).toBe(true);
    expect(canResendInvite("operator", "registered")).toBe(false);

    expect(canResetPassword("admin", "registered")).toBe(true);
    expect(canResetPassword("operator", "registered")).toBe(true);
    expect(canResetPassword("operator", "pending")).toBe(false);
  });
});
