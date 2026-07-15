import type {
  Account,
  AccountAuthUser,
  Consultant,
  ConsultantAuthUser,
} from "@/infrastructure/auth/auth-types";
import { AuthError } from "@/infrastructure/auth/verify-auth";

export function getAccount(
  authUser: AccountAuthUser,
  organizationId: string,
): Account | undefined {
  return authUser.accounts.find(
    (account) =>
      account.organizationId === organizationId && account.status === "active",
  );
}

export function getConsultant(
  authUser: ConsultantAuthUser,
  organizationId: string,
): Consultant | undefined {
  return authUser.consultants.find(
    (consultant) =>
      consultant.organizationId === organizationId && consultant.isActive,
  );
}

export function requireRoleId(
  authUser: AccountAuthUser,
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
  authUser: ConsultantAuthUser,
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
