import type { Account, AuthUser } from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function getAccount(
  authUser: AuthUser,
  organizationId: string,
): Account | undefined {
  return authUser.accounts.find(
    (account) =>
      account.organizationId === organizationId && account.status === "active",
  );
}

export function requireRoleId(
  authUser: AuthUser,
  organizationId: string,
  ...allowedRoleIds: string[]
): Account {
  const account = getAccount(authUser, organizationId);

  if (!account) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (!allowedRoleIds.includes(account.roleId)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `Role '${account.roleId}' is not allowed. Required: ${allowedRoleIds.join(", ")}`,
    );
  }

  return account;
}

export function requireConsultant(
  authUser: AuthUser,
  organizationId: string,
): Account {
  const account = getAccount(authUser, organizationId);

  if (!account) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (!account.isConsultant) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      "Consultant role is required for this organization",
    );
  }

  return account;
}
