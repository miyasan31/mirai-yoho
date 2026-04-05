import type { AuthUser, UserRole } from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function requireRole(
  authUser: AuthUser,
  ...allowedRoles: UserRole[]
): void {
  const role =
    authUser.memberships.find(
      (membership) =>
        membership.organizationId === authUser.currentOrganizationId &&
        membership.status === "active",
    )?.role ??
    authUser.memberships.find((membership) =>
      allowedRoles.includes(membership.role),
    )?.role;

  if (!role) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `No allowed role found. Required: ${allowedRoles.join(", ")}`,
    );
  }
}
