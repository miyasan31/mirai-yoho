import type {
  AuthUser,
  OrganizationAccount,
  UserRole,
} from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function getOrganizationAccount(
  authUser: AuthUser,
  organizationId: string,
): OrganizationAccount | undefined {
  return authUser.accounts.find(
    (account) =>
      account.organizationId === organizationId && account.status === "active",
  );
}

export function requireOrganizationRole(
  authUser: AuthUser,
  organizationId: string,
  ...allowedRoles: UserRole[]
): OrganizationAccount {
  const account = getOrganizationAccount(authUser, organizationId);

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
