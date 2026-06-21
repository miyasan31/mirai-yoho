import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { createDefaultConsultantRanks } from "../src/domain/organization-settings/consultant-rank";
import { app, db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const MEMBERSHIP_COLLECTION = FIRESTORE_COLLECTIONS.organizationMemberships;
const USER_PREFERENCES_COLLECTION = FIRESTORE_COLLECTIONS.userPreferences;
const SETTINGS_COLLECTION = FIRESTORE_COLLECTIONS.organizationSettings;

async function main() {
  const [organizationId, organizationName, adminEmail] = process.argv.slice(2);

  if (!organizationId || !organizationName || !adminEmail) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/create-organization.ts <organizationId> <organizationName> <adminEmail>",
    );
    process.exit(1);
  }

  const existingOrganization = await db
    .collection(ORGANIZATION_COLLECTION)
    .doc(organizationId)
    .get();

  if (existingOrganization.exists) {
    console.error(`Organization '${organizationId}' already exists`);
    process.exit(1);
  }

  const auth = getAuth(app);
  let userRecord = await auth.getUserByEmail(adminEmail).catch(() => null);
  const temporaryPassword = crypto.randomUUID();

  if (!userRecord) {
    userRecord = await auth.createUser({
      email: adminEmail,
      password: temporaryPassword,
    });
  }

  const now = Timestamp.now();
  const membershipId = `${organizationId}_${userRecord.uid}`;
  const defaultConsultantRanks = createDefaultConsultantRanks();

  await db.collection(ORGANIZATION_COLLECTION).doc(organizationId).set({
    organizationId,
    name: organizationName,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .collection(MEMBERSHIP_COLLECTION)
    .doc(membershipId)
    .set({
      uid: userRecord.uid,
      organizationId,
      role: "admin",
      status: userRecord.metadata.lastSignInTime ? "active" : "invited",
      createdAt: now,
      updatedAt: now,
    });

  await db.collection(USER_PREFERENCES_COLLECTION).doc(userRecord.uid).set(
    {
      lastOrganizationId: organizationId,
      updatedAt: now,
    },
    { merge: true },
  );

  await db.collection(SETTINGS_COLLECTION).doc(organizationId).set(
    {
      organizationId,
      consultantSelectionEnabled: true,
      consultantRanks: defaultConsultantRanks,
      defaultConsultantRankId: defaultConsultantRanks[0].rankId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const passwordResetLink = await auth.generatePasswordResetLink(adminEmail);

  console.log("Organization created successfully");
  console.log(`organizationId: ${organizationId}`);
  console.log(`organizationName: ${organizationName}`);
  console.log(`adminUid: ${userRecord.uid}`);
  console.log(`adminEmail: ${adminEmail}`);
  console.log(`passwordResetLink: ${passwordResetLink}`);

  if (!userRecord.metadata.lastSignInTime) {
    console.log(`temporaryPassword: ${temporaryPassword}`);
  }
}

main().catch((error) => {
  console.error("Failed to create organization", error);
  process.exit(1);
});
