import type { AuthorizationPermission } from "@/domain/authorization/authorization-permission";
import { SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/organization-role";
import type {
  AuthUser,
  OrganizationAccount,
} from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function hasOrganizationPermission(
  account: OrganizationAccount,
  permission: AuthorizationPermission,
): boolean {
  return account.permissions.includes(permission);
}

export function requireOrganizationPermission(
  authUser: AuthUser,
  organizationId: string,
  permission: AuthorizationPermission,
): OrganizationAccount {
  const account = authUser.accounts.find(
    (candidate) =>
      candidate.organizationId === organizationId &&
      candidate.status === "active",
  );

  if (!account) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (!hasOrganizationPermission(account, permission)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `Permission '${permission}' is required`,
    );
  }

  return account;
}

export function requireSystemAdminRole(
  authUser: AuthUser,
  organizationId: string,
): OrganizationAccount {
  const account = authUser.accounts.find(
    (candidate) =>
      candidate.organizationId === organizationId &&
      candidate.status === "active",
  );

  if (!account) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (account.role !== SYSTEM_ADMIN_ROLE_ID) {
    throw new AuthError(403, "FORBIDDEN", "Built-in admin role is required");
  }

  return account;
}
