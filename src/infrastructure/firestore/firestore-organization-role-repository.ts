import type { Timestamp } from "firebase-admin/firestore";
import {
  type AuthorizationPermission,
  isAuthorizationPermission,
  normalizePermissions,
} from "@/domain/authorization/authorization-permission";
import { OrganizationRole } from "@/domain/authorization/organization-role";
import type { OrganizationRoleRepository } from "@/domain/authorization/organization-role-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.organizationRoles;

interface OrganizationRoleDoc {
  organizationId: string;
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

function toDate(value?: Timestamp | Date): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: OrganizationRoleDoc): OrganizationRole {
  const permissions = doc.permissions.filter(
    isAuthorizationPermission,
  ) as AuthorizationPermission[];
  const createdAt = toDate(doc.createdAt);
  return OrganizationRole.reconstruct({
    organizationId: doc.organizationId,
    roleId: doc.roleId,
    name: doc.name,
    description: doc.description ?? "",
    permissions: normalizePermissions(permissions),
    isSystem: doc.isSystem ?? false,
    createdAt,
    updatedAt: toDate(doc.updatedAt) ?? createdAt,
  });
}

function toFirestore(role: OrganizationRole): OrganizationRoleDoc {
  return {
    organizationId: role.getOrganizationId(),
    roleId: role.getRoleId(),
    name: role.getName(),
    description: role.getDescription(),
    permissions: role.getPermissions(),
    isSystem: role.getIsSystem(),
    createdAt: role.getCreatedAt(),
    updatedAt: role.getUpdatedAt(),
  };
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
    const doc = await db
      .collection(COLLECTION)
      .doc(getOrganizationRoleDocId(organizationId, roleId))
      .get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as OrganizationRoleDoc);
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationRole[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) =>
      toDomain(doc.data() as OrganizationRoleDoc),
    );
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
