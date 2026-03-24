import type { AuthUser, UserRole } from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function requireRole(
  authUser: AuthUser,
  ...allowedRoles: UserRole[]
): void {
  if (!allowedRoles.includes(authUser.role)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `Role '${authUser.role}' is not allowed. Required: ${allowedRoles.join(", ")}`,
    );
  }
}
