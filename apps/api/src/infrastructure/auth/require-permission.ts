import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/role";
import type { Account, AuthUser } from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function hasPermission(
  account: Account,
  permission: AuthorizationPermission,
): boolean {
  return account.permissions.includes(permission);
}

export function requirePermission(
  authUser: AuthUser,
  organizationId: string,
  permission: AuthorizationPermission,
): Account {
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

  if (!hasPermission(account, permission)) {
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
): Account {
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

  if (account.roleId !== SYSTEM_ADMIN_ROLE_ID) {
    throw new AuthError(403, "FORBIDDEN", "Built-in admin role is required");
  }

  return account;
}
