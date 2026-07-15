import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import type {
  Account,
  AuthUser,
  Consultant,
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

export async function loadAuthUser(accountId: string): Promise<AuthUser> {
  const accountRepository = createAccountRepository();
  const organizationRepository = createOrganizationRepository();
  const consultantRepository = createConsultantRepository();

  const [accounts, consultants] = await Promise.all([
    accountRepository.findByAccountId(accountId),
    consultantRepository.findByConsultantId(accountId),
  ]);
  const activeAccounts = accounts
    .filter((account) => account.getStatus() === "active")
    .sort(
      (left, right) =>
        left.getCreatedAt().getTime() - right.getCreatedAt().getTime(),
    );
  const activeConsultants = consultants
    .filter((consultant) => consultant.getIsActive())
    .sort(
      (left, right) =>
        left.getCreatedAt().getTime() - right.getCreatedAt().getTime(),
    );

  const organizationIds = [
    ...new Set([
      ...activeAccounts.map((account) => account.getOrganizationId()),
      ...activeConsultants.map((consultant) => consultant.getOrganizationId()),
    ]),
  ];
  const organizations = await organizationRepository.findByIds(organizationIds);
  const nameById = new Map<string, string>();
  for (const organization of organizations) {
    nameById.set(organization.getOrganizationId(), organization.getName());
  }

  const accountOrganizationIds = activeAccounts.map((account) =>
    account.getOrganizationId(),
  );
  const roleRepository = new FirestoreRoleRepository();
  const roleByOrganizationAndRole = new Map<
    string,
    { name: string; permissions: AuthorizationPermission[] }
  >();
  const rolesByOrganization = await Promise.all(
    [...new Set(accountOrganizationIds)].map(async (organizationId) => ({
      organizationId,
      roles: await roleRepository.findByOrganizationId(organizationId),
    })),
  );
  for (const { organizationId, roles } of rolesByOrganization) {
    for (const role of roles) {
      roleByOrganizationAndRole.set(`${organizationId}_${role.getRoleId()}`, {
        name: role.getName(),
        permissions: role.getPermissions(),
      });
    }
  }

  const accountViews: Account[] = activeAccounts.map((account) => {
    const organizationId = account.getOrganizationId();
    const roleKey = `${organizationId}_${account.getRoleId()}`;
    return {
      organizationId,
      name: nameById.get(organizationId) ?? organizationId,
      roleId: account.getRoleId(),
      roleName:
        roleByOrganizationAndRole.get(roleKey)?.name ?? account.getRoleId(),
      permissions: roleByOrganizationAndRole.get(roleKey)?.permissions ?? [],
      status: account.getStatus(),
      createdAt: account.getCreatedAt().toISOString(),
    };
  });

  const consultantViews: Consultant[] = activeConsultants.map((consultant) => {
    const organizationId = consultant.getOrganizationId();
    return {
      organizationId,
      name: consultant.getProfile().getDisplayName(),
      isActive: consultant.getIsActive(),
      createdAt: consultant.getCreatedAt().toISOString(),
    };
  });

  const firstAccount = activeAccounts[0];
  const firstConsultant = activeConsultants[0];
  const currentOrganizationId =
    accountViews[0]?.organizationId ??
    consultantViews[0]?.organizationId ??
    null;
  const currentDisplayName =
    firstAccount && firstAccount.getOrganizationId() === currentOrganizationId
      ? (firstAccount.getName() ?? null)
      : firstConsultant &&
          firstConsultant.getOrganizationId() === currentOrganizationId
        ? firstConsultant.getProfile().getDisplayName()
        : null;

  return {
    authUid: accountId,
    accounts: accountViews,
    consultants: consultantViews,
    currentOrganizationId,
    currentDisplayName,
  };
}

export async function setLastOrganizationId(
  _accountId: string,
  _organizationId: string,
): Promise<void> {
  // 組織選択の保持はフロント側で行う
}
