import type {
  AuthUser,
  OrganizationMembership,
  UserRole,
} from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function getOrganizationMembership(
  authUser: AuthUser,
  organizationId: string,
): OrganizationMembership | undefined {
  return authUser.memberships.find(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.status === "active",
  );
}

export function requireOrganizationRole(
  authUser: AuthUser,
  organizationId: string,
  ...allowedRoles: UserRole[]
): OrganizationMembership {
  const membership = getOrganizationMembership(authUser, organizationId);

  if (!membership) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `Role '${membership.role}' is not allowed. Required: ${allowedRoles.join(", ")}`,
    );
  }

  return membership;
}
