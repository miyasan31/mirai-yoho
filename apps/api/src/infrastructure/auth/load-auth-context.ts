import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { Timestamp } from "firebase-admin/firestore";
import type { Account, AuthUser } from "@/infrastructure/auth/auth-types";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";
import { FirestoreRoleRepository } from "@/infrastructure/firestore/firestore-role-repository";

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const CONSULTANT_COLLECTION = FIRESTORE_COLLECTIONS.consultants;

interface AccountDoc {
  authUid: string;
  organizationId: string;
  roleId: string;
  status: "active" | "invited" | "disabled";
  createdAt: Timestamp;
  name?: string;
}

interface OrganizationDoc {
  organizationId: string;
  name: string;
}

interface ConsultantDoc {
  organizationId: string;
  consultantId: string;
}

function toIsoString(value: Timestamp | Date | string): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function getAccountDocId(
  organizationId: string,
  authUid: string,
): string {
  return `${organizationId}_${authUid}`;
}

export async function activateInvitedAccounts(authUid: string): Promise<void> {
  const invitedSnapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("authUid", "==", authUid)
    .where("status", "==", "invited")
    .get();

  if (invitedSnapshot.empty) {
    return;
  }

  const batch = db.batch();
  for (const invitedDoc of invitedSnapshot.docs) {
    batch.update(invitedDoc.ref, {
      status: "active",
      updatedAt: new Date(),
    });
  }

  await batch.commit();
}

export async function loadAuthUser(authUid: string): Promise<AuthUser> {
  const accountSnapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("authUid", "==", authUid)
    .where("status", "==", "active")
    .get();

  const accountDocs = accountSnapshot.docs.map(
    (doc) => doc.data() as AccountDoc,
  );
  accountDocs.sort(
    (left, right) =>
      new Date(toIsoString(left.createdAt)).getTime() -
      new Date(toIsoString(right.createdAt)).getTime(),
  );

  const organizationIds = [
    ...new Set(accountDocs.map((doc) => doc.organizationId)),
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
    .where("consultantId", "==", authUid)
    .get();
  const consultantOrganizationIds = new Set(
    consultantSnapshot.docs.map(
      (doc) => (doc.data() as ConsultantDoc).organizationId,
    ),
  );

  const accounts: Account[] = accountDocs.map((doc) => ({
    organizationId: doc.organizationId,
    name: nameById.get(doc.organizationId) ?? doc.organizationId,
    roleId: doc.roleId,
    roleName:
      roleByOrganizationAndRole.get(`${doc.organizationId}_${doc.roleId}`)
        ?.name ?? doc.roleId,
    permissions:
      roleByOrganizationAndRole.get(`${doc.organizationId}_${doc.roleId}`)
        ?.permissions ?? [],
    isConsultant: consultantOrganizationIds.has(doc.organizationId),
    status: doc.status,
    createdAt: toIsoString(doc.createdAt),
  }));

  const currentOrganizationId = accounts[0]?.organizationId ?? null;
  const currentAccountDoc = accountDocs.find(
    (doc) => doc.organizationId === currentOrganizationId,
  );

  return {
    authUid,
    accounts,
    currentOrganizationId,
    currentDisplayName: currentAccountDoc?.name ?? null,
  };
}

export async function setLastOrganizationId(
  _authUid: string,
  _organizationId: string,
): Promise<void> {
  // 組織選択の保持はフロント側で行う
}

export async function setUserDisplayName(
  organizationId: string,
  authUid: string,
  name: string,
): Promise<void> {
  const docId = getAccountDocId(organizationId, authUid);
  await db
    .collection(ACCOUNT_COLLECTION)
    .doc(docId)
    .set({ name, updatedAt: new Date() }, { merge: true });
}
