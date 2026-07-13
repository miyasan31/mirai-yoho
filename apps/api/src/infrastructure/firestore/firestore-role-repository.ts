import {
  type AuthorizationPermission,
  isAuthorizationPermission,
  normalizePermissions,
} from "@mirai-yoho/shared/authorization-permission";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import {
  createSystemRole,
  isSystemRoleId,
  Role,
} from "@/domain/authorization/role";
import type { RoleRepository } from "@/domain/authorization/role-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.roles;

interface RoleDoc {
  organizationId: string;
  roleId: string;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

type RoleWriteDoc = Omit<RoleDoc, "permissions" | "createdAt" | "updatedAt"> & {
  permissions?: string[] | FieldValue;
  createdAt: Date;
  updatedAt: Date;
};

function toDate(value?: Timestamp | Date): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: RoleDoc): Role {
  const createdAt = toDate(doc.createdAt);
  const updatedAt = toDate(doc.updatedAt);
  const systemRole = createSystemRole(doc.organizationId, doc.roleId);

  if (systemRole) {
    return Role.reconstruct({
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
  return Role.reconstruct({
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

function toFirestore(role: Role): RoleWriteDoc {
  const doc: RoleWriteDoc = {
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

export function getRoleDocId(organizationId: string, roleId: string): string {
  return `${organizationId}_${roleId}`;
}

export class FirestoreRoleRepository implements RoleRepository {
  async findById(organizationId: string, roleId: string): Promise<Role | null> {
    const systemRole = createSystemRole(organizationId, roleId);
    const doc = await db
      .collection(COLLECTION)
      .doc(getRoleDocId(organizationId, roleId))
      .get();
    if (!doc.exists) return systemRole;
    return toDomain(doc.data() as RoleDoc);
  }

  async findByOrganizationId(organizationId: string): Promise<Role[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    const customRoles = snapshot.docs
      .map((doc) => doc.data() as RoleDoc)
      .filter((doc) => !isSystemRoleId(doc.roleId))
      .map(toDomain);

    return [
      Role.createSystemAdmin(organizationId),
      Role.createSystemOperator(organizationId),
      ...customRoles,
    ];
  }

  async save(role: Role): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getRoleDocId(role.getOrganizationId(), role.getRoleId()))
      .set(toFirestore(role), { merge: true });
  }

  async delete(organizationId: string, roleId: string): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(getRoleDocId(organizationId, roleId))
      .delete();
  }
}
