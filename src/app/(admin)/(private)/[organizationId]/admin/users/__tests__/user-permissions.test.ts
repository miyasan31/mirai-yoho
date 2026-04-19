import {
  canDeleteAdminUser,
  canEditDisplayName,
  canEditRole,
  canInviteAdminUsers,
  canManageAdminUsers,
  canResendInvite,
  canResetPassword,
} from "../user-permissions";

describe("user permissions", () => {
  it("allows admin and operator to access user management and invite", () => {
    expect(canManageAdminUsers("admin")).toBe(true);
    expect(canManageAdminUsers("operator")).toBe(true);
    expect(canManageAdminUsers(null)).toBe(false);
    expect(canInviteAdminUsers("admin")).toBe(true);
    expect(canInviteAdminUsers("operator")).toBe(true);
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
    expect(canDeleteAdminUser("admin")).toBe(true);
    expect(canDeleteAdminUser("operator")).toBe(false);
  });

  it("allows resend invite only for pending users and reset password only for registered users", () => {
    expect(canResendInvite("admin", "pending")).toBe(true);
    expect(canResendInvite("operator", "pending")).toBe(true);
    expect(canResendInvite("operator", "registered")).toBe(false);

    expect(canResetPassword("admin", "registered")).toBe(true);
    expect(canResetPassword("operator", "registered")).toBe(true);
    expect(canResetPassword("operator", "pending")).toBe(false);
  });
});
