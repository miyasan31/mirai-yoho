import { FieldValue } from "firebase-admin/firestore";
import { OrganizationRole } from "../src/domain/authorization/organization-role";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";
import { getOrganizationRoleDocId } from "../src/infrastructure/firestore/firestore-organization-role-repository";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const ROLE_COLLECTION = FIRESTORE_COLLECTIONS.organizationRoles;

async function saveIfMissing(role: OrganizationRole): Promise<boolean> {
  const ref = db
    .collection(ROLE_COLLECTION)
    .doc(getOrganizationRoleDocId(role.getOrganizationId(), role.getRoleId()));
  const existing = await ref.get();
  if (existing.exists) {
    await ref.set(
      {
        organizationId: role.getOrganizationId(),
        roleId: role.getRoleId(),
        name: role.getName(),
        description: role.getDescription(),
        permissions: FieldValue.delete(),
        isSystem: role.getIsSystem(),
        updatedAt: new Date(),
      },
      { merge: true },
    );
    return false;
  }

  await ref.set({
    organizationId: role.getOrganizationId(),
    roleId: role.getRoleId(),
    name: role.getName(),
    description: role.getDescription(),
    isSystem: role.getIsSystem(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return true;
}

async function main() {
  const snapshot = await db.collection(ORGANIZATION_COLLECTION).get();
  let createdCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as { organizationId?: string };
    const organizationId = data.organizationId ?? doc.id;
    const roles = [
      OrganizationRole.createSystemAdmin(organizationId),
      OrganizationRole.createSystemOperator(organizationId),
    ];

    for (const role of roles) {
      if (await saveIfMissing(role)) {
        createdCount += 1;
      }
    }
  }

  console.log(`Organization role migration completed. created=${createdCount}`);
}

main().catch((error) => {
  console.error("Failed to migrate organization roles", error);
  process.exit(1);
});
