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

export function requireRole(
  authUser: AuthUser,
  organizationId: string,
  ...allowedRoles: string[]
): Account {
  const account = getAccount(authUser, organizationId);

  if (!account) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User does not belong to organization '${organizationId}'`,
    );
  }

  if (!allowedRoles.includes(account.role)) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `Role '${account.role}' is not allowed. Required: ${allowedRoles.join(", ")}`,
    );
  }

  return account;
}
