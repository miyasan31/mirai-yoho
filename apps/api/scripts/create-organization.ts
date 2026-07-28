import crypto from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { Role } from "../src/domain/authorization/role";
import { createDefaultConsultantStatuses } from "../src/domain/settings/consultant-status";
import { app, db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { getRoleDocId } from "../src/infrastructure/firestore/firestore-role-repository";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const ROLE_COLLECTION = FIRESTORE_COLLECTIONS.roles;
const SETTINGS_COLLECTION = FIRESTORE_COLLECTIONS.settings;

async function main() {
  const [organizationId, name, adminEmail, adminName] = process.argv.slice(2);

  if (!organizationId || !name || !adminEmail) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/create-organization.ts <organizationId> <name> <adminEmail> [adminName]",
    );
    process.exit(1);
  }

  const normalizedAdminName = adminName?.trim() ? adminName.trim() : null;

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
  const accountDocId = `${organizationId}_${userRecord.uid}`;
  const defaultConsultantStatuses = createDefaultConsultantStatuses();

  await db.collection(ORGANIZATION_COLLECTION).doc(organizationId).set({
    organizationId,
    name: name,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .collection(ACCOUNT_COLLECTION)
    .doc(accountDocId)
    .set({
      accountId: userRecord.uid,
      organizationId,
      roleId: "admin",
      status: userRecord.metadata.lastSignInTime ? "active" : "invited",
      name: normalizedAdminName,
      createdAt: now,
      updatedAt: now,
    });

  const systemRoles = [
    Role.createSystemAdmin(organizationId),
    Role.createSystemOperator(organizationId),
  ];
  for (const role of systemRoles) {
    await db
      .collection(ROLE_COLLECTION)
      .doc(getRoleDocId(organizationId, role.getRoleId()))
      .set({
        organizationId: role.getOrganizationId(),
        roleId: role.getRoleId(),
        name: role.getName(),
        description: role.getDescription(),
        isSystem: role.getIsSystem(),
        createdAt: now,
        updatedAt: now,
      });
  }

  await db.collection(SETTINGS_COLLECTION).doc(organizationId).set(
    {
      organizationId,
      consultantStatuses: defaultConsultantStatuses,
      defaultConsultantStatusId: defaultConsultantStatuses[0].statusId,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  const passwordResetLink = await auth.generatePasswordResetLink(adminEmail);

  console.log("Organization created successfully");
  console.log(`organizationId: ${organizationId}`);
  console.log(`name: ${name}`);
  console.log(`adminUid: ${userRecord.uid}`);
  console.log(`adminEmail: ${adminEmail}`);
  console.log(`adminName: ${normalizedAdminName ?? "(not set)"}`);
  console.log(`passwordResetLink: ${passwordResetLink}`);

  if (!userRecord.metadata.lastSignInTime) {
    console.log(`temporaryPassword: ${temporaryPassword}`);
  }
}

main().catch((error) => {
  console.error("Failed to create organization", error);
  process.exit(1);
});
