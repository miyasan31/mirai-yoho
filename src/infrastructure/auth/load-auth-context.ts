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
  displayName?: string;
}

interface LoadAuthUserOptions {
  activateInvitedMemberships?: boolean;
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

export async function loadAuthUser(
  uid: string,
  options?: LoadAuthUserOptions,
): Promise<AuthUser> {
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

  const shouldActivateInvitedMemberships = membershipDocs.some(
    (doc) => doc.status === "invited",
  );

  if (options?.activateInvitedMemberships && shouldActivateInvitedMemberships) {
    const now = Timestamp.now();
    const batch = db.batch();

    for (const doc of membershipSnapshot.docs) {
      const data = doc.data() as OrganizationMembershipDoc;
      if (data.status !== "invited") continue;

      batch.update(doc.ref, {
        status: "active",
        updatedAt: now,
      });
      data.status = "active";
    }

    await batch.commit();
  }

  const normalizedMembershipDocs = membershipDocs.map((doc) =>
    options?.activateInvitedMemberships && doc.status === "invited"
      ? { ...doc, status: "active" as const }
      : doc,
  );

  normalizedMembershipDocs.sort(
    (left, right) =>
      new Date(toIsoString(left.createdAt)).getTime() -
      new Date(toIsoString(right.createdAt)).getTime(),
  );

  const organizationIds = [
    ...new Set(normalizedMembershipDocs.map((doc) => doc.organizationId)),
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

  const memberships: OrganizationMembership[] = normalizedMembershipDocs.map(
    (doc) => ({
      organizationId: doc.organizationId,
      organizationName:
        organizationNameById.get(doc.organizationId) ?? doc.organizationId,
      role: doc.role,
      status: doc.status,
      createdAt: toIsoString(doc.createdAt),
    }),
  );

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
    currentDisplayName: userPreferences?.displayName ?? null,
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

export async function setUserDisplayName(
  uid: string,
  displayName: string,
): Promise<void> {
  await db.collection(USER_PREFERENCES_COLLECTION).doc(uid).set(
    {
      displayName,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}
