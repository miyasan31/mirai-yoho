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

interface AccountViewsResult {
  accountViews: Account[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}

async function buildAccountViews(
  accountId: string,
): Promise<AccountViewsResult> {
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

  const firstAccount = activeAccounts[0];
  return {
    accountViews,
    currentOrganizationId: firstAccount?.getOrganizationId() ?? null,
    currentDisplayName: firstAccount?.getName() ?? null,
  };
}

interface ConsultantViewsResult {
  consultantViews: Consultant[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}

async function buildConsultantViews(
  consultantId: string,
): Promise<ConsultantViewsResult> {
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
  await organizationRepository.findByIds(organizationIds);

  const consultantViews: Consultant[] = activeConsultants.map((consultant) => ({
    organizationId: consultant.getOrganizationId(),
    name: consultant.getProfile().getDisplayName(),
    isActive: consultant.getIsActive(),
    createdAt: consultant.getCreatedAt().toISOString(),
  }));

  const firstConsultant = activeConsultants[0];
  return {
    consultantViews,
    currentOrganizationId: firstConsultant?.getOrganizationId() ?? null,
    currentDisplayName: firstConsultant?.getProfile().getDisplayName() ?? null,
  };
}

export async function loadAccountAuthUser(
  accountId: string,
): Promise<AccountAuthUser> {
  const { accountViews, currentOrganizationId, currentDisplayName } =
    await buildAccountViews(accountId);
  return {
    authUid: accountId,
    accounts: accountViews,
    currentOrganizationId,
    currentDisplayName,
  };
}

export async function loadConsultantAuthUser(
  consultantId: string,
): Promise<ConsultantAuthUser> {
  const { consultantViews, currentOrganizationId, currentDisplayName } =
    await buildConsultantViews(consultantId);
  return {
    authUid: consultantId,
    consultants: consultantViews,
    currentOrganizationId,
    currentDisplayName,
  };
}

/**
 * dual-context ルート専用: accounts と consultants の両方を引く。
 * account 側があればそちらの currentOrganizationId を優先する。
 */
export async function loadAuthUser(authUid: string): Promise<AuthUser> {
  const [account, consultant] = await Promise.all([
    buildAccountViews(authUid),
    buildConsultantViews(authUid),
  ]);
  const currentOrganizationId =
    account.currentOrganizationId ?? consultant.currentOrganizationId ?? null;
  const currentDisplayName =
    account.currentOrganizationId === currentOrganizationId
      ? account.currentDisplayName
      : consultant.currentDisplayName;
  return {
    authUid,
    accounts: account.accountViews,
    consultants: consultant.consultantViews,
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
