import { Timestamp } from "firebase-admin/firestore";
import type { AuthorizationPermission } from "@/domain/authorization/authorization-permission";
import type {
  AuthUser,
  OrganizationAccount,
} from "@/infrastructure/auth/auth-types";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";
import { FirestoreOrganizationRoleRepository } from "@/infrastructure/firestore/firestore-organization-role-repository";

const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.organizationAccounts;
const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;

interface OrganizationAccountDoc {
  uid: string;
  organizationId: string;
  role: string;
  status: "active" | "invited" | "disabled";
  createdAt: Timestamp;
  name?: string;
}

interface OrganizationDoc {
  organizationId: string;
  name: string;
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

export function getOrganizationAccountDocId(
  organizationId: string,
  uid: string,
): string {
  return `${organizationId}_${uid}`;
}

export async function activateInvitedAccounts(uid: string): Promise<void> {
  const invitedSnapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("uid", "==", uid)
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

export async function loadAuthUser(uid: string): Promise<AuthUser> {
  const accountSnapshot = await db
    .collection(ACCOUNT_COLLECTION)
    .where("uid", "==", uid)
    .where("status", "==", "active")
    .get();

  const accountDocs = accountSnapshot.docs.map(
    (doc) => doc.data() as OrganizationAccountDoc,
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

  const roleRepository = new FirestoreOrganizationRoleRepository();
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

  const accounts: OrganizationAccount[] = accountDocs.map((doc) => ({
    organizationId: doc.organizationId,
    name: nameById.get(doc.organizationId) ?? doc.organizationId,
    role: doc.role,
    roleName:
      roleByOrganizationAndRole.get(`${doc.organizationId}_${doc.role}`)
        ?.name ?? doc.role,
    permissions:
      roleByOrganizationAndRole.get(`${doc.organizationId}_${doc.role}`)
        ?.permissions ?? [],
    status: doc.status,
    createdAt: toIsoString(doc.createdAt),
  }));

  const currentOrganizationId = accounts[0]?.organizationId ?? null;
  const currentAccountDoc = accountDocs.find(
    (doc) => doc.organizationId === currentOrganizationId,
  );

  return {
    uid,
    accounts,
    currentOrganizationId,
    currentDisplayName: currentAccountDoc?.name ?? null,
  };
}

export async function setLastOrganizationId(
  _uid: string,
  _organizationId: string,
): Promise<void> {
  // 組織選択の保持はフロント側で行う
}

export async function setUserDisplayName(
  organizationId: string,
  uid: string,
  name: string,
): Promise<void> {
  const docId = getOrganizationAccountDocId(organizationId, uid);
  await db
    .collection(ACCOUNT_COLLECTION)
    .doc(docId)
    .set({ name, updatedAt: new Date() }, { merge: true });
}
