import type { AuthUser, UserRole } from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function requireRole(
  authUser: AuthUser,
  ...allowedRoles: UserRole[]
): void {
  const role =
    authUser.accounts.find(
      (account) =>
        account.organizationId === authUser.currentOrganizationId &&
        account.status === "active",
    )?.role ??
    authUser.accounts.find((account) =>
      allowedRoles.includes(account.role as UserRole),
    )?.role;

  if (!role || !allowedRoles.includes(role as UserRole)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `No allowed role found. Required: ${allowedRoles.join(", ")}`,
    );
  }
}
