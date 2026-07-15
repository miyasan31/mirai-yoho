import type {
  Account,
  AuthUser,
  Consultant,
} from "@/infrastructure/auth/auth-types";
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

export function getConsultant(
  authUser: AuthUser,
  organizationId: string,
): Consultant | undefined {
  return authUser.consultants.find(
    (consultant) =>
      consultant.organizationId === organizationId && consultant.isActive,
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
): Consultant {
  const consultant = getConsultant(authUser, organizationId);

  if (!consultant) {
    throw new AuthError(
      403,
      "FORBIDDEN",
      `User is not an active consultant in organization '${organizationId}'`,
    );
  }

  return consultant;
}
