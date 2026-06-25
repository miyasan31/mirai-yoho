import { Timestamp } from "firebase-admin/firestore";
import type {
  AuthUser,
  OrganizationMembership,
  UserRole,
} from "@/infrastructure/auth/auth-types";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const MEMBERSHIP_COLLECTION = FIRESTORE_COLLECTIONS.organizationMemberships;
const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;

interface OrganizationMembershipDoc {
  uid: string;
  organizationId: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
  createdAt: Timestamp;
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

export function getOrganizationMembershipDocId(
  organizationId: string,
  uid: string,
): string {
  return `${organizationId}_${uid}`;
}

export async function activateInvitedMemberships(uid: string): Promise<void> {
  const invitedSnapshot = await db
    .collection(MEMBERSHIP_COLLECTION)
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
  const membershipSnapshot = await db
    .collection(MEMBERSHIP_COLLECTION)
    .where("uid", "==", uid)
    .where("status", "==", "active")
    .get();

  const membershipDocs = membershipSnapshot.docs.map(
    (doc) => doc.data() as OrganizationMembershipDoc,
  );
  membershipDocs.sort(
    (left, right) =>
      new Date(toIsoString(left.createdAt)).getTime() -
      new Date(toIsoString(right.createdAt)).getTime(),
  );

  const organizationIds = [
    ...new Set(membershipDocs.map((doc) => doc.organizationId)),
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

  const memberships: OrganizationMembership[] = membershipDocs.map((doc) => ({
    organizationId: doc.organizationId,
    name: nameById.get(doc.organizationId) ?? doc.organizationId,
    role: doc.role,
    status: doc.status,
    createdAt: toIsoString(doc.createdAt),
  }));

  const currentOrganizationId = memberships[0]?.organizationId ?? null;

  return {
    uid,
    memberships,
    currentOrganizationId,
    currentDisplayName: null,
  };
}

export async function setLastOrganizationId(
  _uid: string,
  _organizationId: string,
): Promise<void> {
  // 組織選択の保持はフロント側で行う
}

export async function setUserDisplayName(
  _uid: string,
  _name: string,
): Promise<void> {
  // 表示名は membership.name で管理する
}
