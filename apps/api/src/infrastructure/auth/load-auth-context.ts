import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import type {
  Account,
  AccountAuthUser,
  AuthUser,
  Consultant,
  ConsultantAuthUser,
} from "@/infrastructure/auth/auth-types";
import {
  createAccountRepository,
  createConsultantRepository,
  createOrganizationRepository,
} from "@/infrastructure/container";
import { FirestoreRoleRepository } from "@/infrastructure/firestore/firestore-role-repository";

export async function activateInvitedAccounts(
  accountId: string,
): Promise<void> {
  const repo = createAccountRepository();
  const accounts = await repo.findByAccountId(accountId);
  const invited = accounts.filter(
    (account) => account.getStatus() === "invited",
  );
  if (invited.length === 0) return;

  for (const account of invited) {
    account.activate();
  }
  await repo.saveAll(invited);
}

async function buildAccountViews(accountId: string): Promise<Account[]> {
  const accountRepository = createAccountRepository();
  const organizationRepository = createOrganizationRepository();
  const accounts = await accountRepository.findByAccountId(accountId);
  const activeAccounts = accounts
    .filter((account) => account.getStatus() === "active")
    .sort(
      (left, right) =>
        left.getCreatedAt().getTime() - right.getCreatedAt().getTime(),
    );

  const organizationIds = [
    ...new Set(activeAccounts.map((account) => account.getOrganizationId())),
  ];
  const roleRepository = new FirestoreRoleRepository();
  const [organizations, rolesByOrganization] = await Promise.all([
    organizationRepository.findByIds(organizationIds),
    roleRepository.findByOrganizationIds(organizationIds),
  ]);

  const nameById = new Map<string, string>();
  for (const organization of organizations) {
    nameById.set(organization.getOrganizationId(), organization.getName());
  }

  const roleByOrganizationAndRole = new Map<
    string,
    { name: string; permissions: AuthorizationPermission[] }
  >();
  for (const [organizationId, roles] of rolesByOrganization) {
    for (const role of roles) {
      roleByOrganizationAndRole.set(`${organizationId}_${role.getRoleId()}`, {
        name: role.getName(),
        permissions: role.getPermissions(),
      });
    }
  }

  return activeAccounts.map((account) => {
    const organizationId = account.getOrganizationId();
    const roleKey = `${organizationId}_${account.getRoleId()}`;
    return {
      organizationId,
      name: nameById.get(organizationId) ?? organizationId,
      displayName: account.getName(),
      roleId: account.getRoleId(),
      roleName:
        roleByOrganizationAndRole.get(roleKey)?.name ?? account.getRoleId(),
      permissions: roleByOrganizationAndRole.get(roleKey)?.permissions ?? [],
      status: account.getStatus(),
      createdAt: account.getCreatedAt().toISOString(),
    };
  });
}

async function buildConsultantViews(
  consultantId: string,
): Promise<Consultant[]> {
  const consultantRepository = createConsultantRepository();
  const organizationRepository = createOrganizationRepository();
  const consultants =
    await consultantRepository.findByConsultantId(consultantId);
  const activeConsultants = consultants
    .filter((consultant) => consultant.getIsActive())
    .sort(
      (left, right) =>
        left.getCreatedAt().getTime() - right.getCreatedAt().getTime(),
    );

  const organizationIds = [
    ...new Set(
      activeConsultants.map((consultant) => consultant.getOrganizationId()),
    ),
  ];
  const organizations = await organizationRepository.findByIds(organizationIds);
  const nameById = new Map<string, string>();
  for (const organization of organizations) {
    nameById.set(organization.getOrganizationId(), organization.getName());
  }

  return activeConsultants.map((consultant) => {
    const organizationId = consultant.getOrganizationId();
    return {
      organizationId,
      name: nameById.get(organizationId) ?? organizationId,
      displayName: consultant.getProfile().getDisplayName(),
      isActive: consultant.getIsActive(),
      createdAt: consultant.getCreatedAt().toISOString(),
    };
  });
}

export async function loadAccountAuthUser(
  accountId: string,
): Promise<AccountAuthUser> {
  return {
    authUid: accountId,
    accounts: await buildAccountViews(accountId),
  };
}

export async function loadConsultantAuthUser(
  consultantId: string,
): Promise<ConsultantAuthUser> {
  return {
    authUid: consultantId,
    consultants: await buildConsultantViews(consultantId),
  };
}

/**
 * dual-context ルート専用: accounts と consultants の両方を引く。
 */
export async function loadAuthUser(authUid: string): Promise<AuthUser> {
  const [accounts, consultants] = await Promise.all([
    buildAccountViews(authUid),
    buildConsultantViews(authUid),
  ]);
  return { authUid, accounts, consultants };
}
