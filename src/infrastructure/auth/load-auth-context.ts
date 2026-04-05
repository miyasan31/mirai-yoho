import { Timestamp } from "firebase-admin/firestore";
import type {
  AuthUser,
  OrganizationMembership,
  UserRole,
} from "@/infrastructure/auth/auth-types";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const MEMBERSHIP_COLLECTION = FIRESTORE_COLLECTIONS.organizationMemberships;
const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const USER_PREFERENCES_COLLECTION = FIRESTORE_COLLECTIONS.userPreferences;

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

interface UserPreferencesDoc {
  lastOrganizationId?: string;
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

export async function loadAuthUser(uid: string): Promise<AuthUser> {
  const [membershipSnapshot, userPreferencesDoc] = await Promise.all([
    db
      .collection(MEMBERSHIP_COLLECTION)
      .where("uid", "==", uid)
      .where("status", "in", ["active", "invited"])
      .get(),
    db.collection(USER_PREFERENCES_COLLECTION).doc(uid).get(),
  ]);

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

  const organizationNameById = new Map<string, string>();
  for (const doc of organizationDocs) {
    if (!doc.exists) continue;
    const organization = doc.data() as OrganizationDoc;
    organizationNameById.set(organization.organizationId, organization.name);
  }

  const memberships: OrganizationMembership[] = membershipDocs.map((doc) => ({
    organizationId: doc.organizationId,
    organizationName:
      organizationNameById.get(doc.organizationId) ?? doc.organizationId,
    role: doc.role,
    status: doc.status,
    createdAt: toIsoString(doc.createdAt),
  }));

  const userPreferences = userPreferencesDoc.exists
    ? (userPreferencesDoc.data() as UserPreferencesDoc)
    : undefined;

  const preferredOrganizationId = userPreferences?.lastOrganizationId;
  const currentOrganizationId =
    memberships.find(
      (membership) => membership.organizationId === preferredOrganizationId,
    )?.organizationId ??
    memberships[0]?.organizationId ??
    null;

  return {
    uid,
    memberships,
    currentOrganizationId,
  };
}

export async function setLastOrganizationId(
  uid: string,
  organizationId: string,
): Promise<void> {
  await db.collection(USER_PREFERENCES_COLLECTION).doc(uid).set(
    {
      lastOrganizationId: organizationId,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}
