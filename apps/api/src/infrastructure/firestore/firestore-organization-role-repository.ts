import {
  type AuthorizationPermission,
  isAuthorizationPermission,
  normalizePermissions,
} from "@mirai-yoho/shared/authorization-permission";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import {
  createSystemOrganizationRole,
  isSystemOrganizationRoleId,
  OrganizationRole,
} from "@/domain/authorization/organization-role";
import type { OrganizationRoleRepository } from "@/domain/authorization/organization-role-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.organizationRoles;

interface OrganizationRoleDoc {
  organizationId: string;
  roleId: string;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

type OrganizationRoleWriteDoc = Omit<
  OrganizationRoleDoc,
  "permissions" | "createdAt" | "updatedAt"
> & {
  permissions?: string[] | FieldValue;
  createdAt: Date;
  updatedAt: Date;
};

function toDate(value?: Timestamp | Date): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: OrganizationRoleDoc): OrganizationRole {
  const createdAt = toDate(doc.createdAt);
  const updatedAt = toDate(doc.updatedAt);
  const systemRole = createSystemOrganizationRole(
    doc.organizationId,
    doc.roleId,
  );

  if (systemRole) {
    return OrganizationRole.reconstruct({
      organizationId: doc.organizationId,
      roleId: doc.roleId,
      name: doc.name || systemRole.getName(),
      description: doc.description ?? systemRole.getDescription(),
      permissions: systemRole.getPermissions(),
      isSystem: true,
      createdAt,
      updatedAt,
    });
  }

  const permissions = (doc.permissions ?? []).filter(
    isAuthorizationPermission,
  ) as AuthorizationPermission[];
  return OrganizationRole.reconstruct({
    organizationId: doc.organizationId,
    roleId: doc.roleId,
    name: doc.name,
    description: doc.description ?? "",
    permissions: normalizePermissions(permissions),
    isSystem: doc.isSystem ?? false,
    createdAt,
    updatedAt,
  });
}

function toFirestore(role: OrganizationRole): OrganizationRoleWriteDoc {
  const doc: OrganizationRoleWriteDoc = {
    organizationId: role.getOrganizationId(),
    roleId: role.getRoleId(),
    name: role.getName(),
    description: role.getDescription(),
    isSystem: role.getIsSystem(),
    createdAt: role.getCreatedAt(),
    updatedAt: role.getUpdatedAt(),
  };

  if (role.getIsSystem()) {
    doc.permissions = FieldValue.delete();
  } else {
    doc.permissions = role.getPermissions();
  }

  return doc;
}

export function getOrganizationRoleDocId(
  organizationId: string,
  roleId: string,
): string {
  return `${organizationId}_${roleId}`;
}

export class FirestoreOrganizationRoleRepository
  implements OrganizationRoleRepository
{
  async findById(
    organizationId: string,
    roleId: string,
  ): Promise<OrganizationRole | null> {
    const systemRole = createSystemOrganizationRole(organizationId, roleId);
    const doc = await db
      .collection(COLLECTION)
      .doc(getOrganizationRoleDocId(organizationId, roleId))
      .get();
    if (!doc.exists) return systemRole;
    return toDomain(doc.data() as OrganizationRoleDoc);
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationRole[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    const customRoles = snapshot.docs
      .map((doc) => doc.data() as OrganizationRoleDoc)
      .filter((doc) => !isSystemOrganizationRoleId(doc.roleId))
      .map(toDomain);

    return [
      OrganizationRole.createSystemAdmin(organizationId),
      OrganizationRole.createSystemOperator(organizationId),
      ...customRoles,
    ];
  }

  async save(role: OrganizationRole): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getOrganizationRoleDocId(role.getOrganizationId(), role.getRoleId()))
      .set(toFirestore(role), { merge: true });
  }

  async delete(organizationId: string, roleId: string): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getOrganizationRoleDocId(organizationId, roleId))
      .delete();
  }
}
