import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import type { Account, AuthUser } from "@/infrastructure/auth/auth-types";
import { createAccountRepository } from "@/infrastructure/container";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";
import { FirestoreRoleRepository } from "@/infrastructure/firestore/firestore-role-repository";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const CONSULTANT_COLLECTION = FIRESTORE_COLLECTIONS.consultants;

interface OrganizationDoc {
  organizationId: string;
  name: string;
}

interface ConsultantDoc {
  organizationId: string;
  consultantId: string;
}

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
  const repo = createAccountRepository();
  const accounts = await repo.findByAccountId(accountId);
  const activeAccounts = accounts
    .filter((account) => account.getStatus() === "active")
    .sort(
      (left, right) =>
        left.getCreatedAt().getTime() - right.getCreatedAt().getTime(),
    );

  const organizationIds = [
    ...new Set(activeAccounts.map((account) => account.getOrganizationId())),
  ];
  const organizationDocs = await Promise.all(
    organizationIds.map((organizationId) =>
      db.collection(ORGANIZATION_COLLECTION).doc(organizationId).get(),
    ),
  );

  const nameById = new Map<string, string>();
  for (const doc of organizationDocs) {
    if (!doc.exists) continue;
    const organization = doc.data() as OrganizationDoc;
    nameById.set(organization.organizationId, organization.name);
  }

  const roleRepository = new FirestoreRoleRepository();
  const roleByOrganizationAndRole = new Map<
    string,
    { name: string; permissions: AuthorizationPermission[] }
  >();
  const rolesByOrganization = await Promise.all(
    organizationIds.map(async (organizationId) => ({
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

  const consultantSnapshot = await db
    .collection(CONSULTANT_COLLECTION)
    .where("consultantId", "==", accountId)
    .get();
  const consultantOrganizationIds = new Set(
    consultantSnapshot.docs.map(
      (doc) => (doc.data() as ConsultantDoc).organizationId,
    ),
  );

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
      isConsultant: consultantOrganizationIds.has(organizationId),
      status: account.getStatus(),
      createdAt: account.getCreatedAt().toISOString(),
    };
  });

  const currentOrganizationId = accountViews[0]?.organizationId ?? null;
  const currentAccount = activeAccounts.find(
    (account) => account.getOrganizationId() === currentOrganizationId,
  );

  return {
    authUid: accountId,
    accounts: accountViews,
    currentOrganizationId,
    currentDisplayName: currentAccount?.getName() ?? null,
  };
}

export async function setLastOrganizationId(
  _accountId: string,
  _organizationId: string,
): Promise<void> {
  // 組織選択の保持はフロント側で行う
}
