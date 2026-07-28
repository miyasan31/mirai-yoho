import { FieldValue } from "firebase-admin/firestore";
import { Role } from "../src/domain/authorization/role";
import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { getRoleDocId } from "../src/infrastructure/firestore/firestore-role-repository";

const ORGANIZATION_COLLECTION = FIRESTORE_COLLECTIONS.organizations;
const ROLE_COLLECTION = FIRESTORE_COLLECTIONS.roles;

type RoleCreationResult = {
  roleId: string;
  created: boolean;
};

function createDefaultRoles(organizationId: string): Role[] {
  return [
    Role.createSystemAdmin(organizationId),
    Role.createSystemOperator(organizationId),
  ];
}

async function ensureOrganizationExists(organizationId: string): Promise<void> {
  const doc = await db
    .collection(ORGANIZATION_COLLECTION)
    .doc(organizationId)
    .get();

  if (!doc.exists) {
    throw new Error(`Organization '${organizationId}' does not exist`);
  }
}

async function saveIfMissing(role: Role): Promise<RoleCreationResult> {
  const ref = db
    .collection(ROLE_COLLECTION)
    .doc(getRoleDocId(role.getOrganizationId(), role.getRoleId()));
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
        updatedAt: role.getUpdatedAt(),
      },
      { merge: true },
    );
    return { roleId: role.getRoleId(), created: false };
  }

  await ref.set({
    organizationId: role.getOrganizationId(),
    roleId: role.getRoleId(),
    name: role.getName(),
    description: role.getDescription(),
    isSystem: role.getIsSystem(),
    createdAt: role.getCreatedAt(),
    updatedAt: role.getUpdatedAt(),
  });

  return { roleId: role.getRoleId(), created: true };
}

async function main() {
  const [organizationId] = process.argv.slice(2);

  if (!organizationId) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/create-default-roles.ts <organizationId>",
    );
    process.exit(1);
  }

  await ensureOrganizationExists(organizationId);

  const results: RoleCreationResult[] = [];
  for (const role of createDefaultRoles(organizationId)) {
    results.push(await saveIfMissing(role));
  }

  const createdCount = results.filter((result) => result.created).length;

  console.log("Default organization roles created successfully");
  console.log(`organizationId: ${organizationId}`);
  console.log(`created: ${createdCount}`);
  const skippedRoleIds = results
    .filter((result) => !result.created)
    .map((result) => result.roleId);
  console.log(`skipped: ${skippedRoleIds.length}`);
  if (skippedRoleIds.length > 0) {
    console.log(`skippedRoleIds: ${skippedRoleIds.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Failed to create default organization roles", error);
  process.exit(1);
});
