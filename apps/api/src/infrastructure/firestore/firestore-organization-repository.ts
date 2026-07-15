import type { Timestamp } from "firebase-admin/firestore";
import { Organization } from "@/domain/organization/organization";
import type { IOrganizationRepository } from "@/domain/organization/organization-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.organizations;

interface OrganizationDoc {
  organizationId: string;
  name: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

function toDate(value?: Timestamp | Date): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: OrganizationDoc): Organization {
  const createdAt = toDate(doc.createdAt);
  return Organization.reconstruct({
    organizationId: doc.organizationId,
    name: doc.name,
    createdAt,
    updatedAt: toDate(doc.updatedAt) || createdAt,
  });
}

function toFirestore(organization: Organization): OrganizationDoc {
  return {
    organizationId: organization.getOrganizationId(),
    name: organization.getName(),
    createdAt: organization.getCreatedAt(),
    updatedAt: organization.getUpdatedAt(),
  };
}

export class FirestoreOrganizationRepository
  implements IOrganizationRepository
{
  async findById(organizationId: string): Promise<Organization | null> {
    const doc = await db.collection(COLLECTION).doc(organizationId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as OrganizationDoc);
  }

  async findByIds(organizationIds: string[]): Promise<Organization[]> {
    if (organizationIds.length === 0) return [];
    const docs = await Promise.all(
      organizationIds.map((organizationId) =>
        db.collection(COLLECTION).doc(organizationId).get(),
      ),
    );
    return docs
      .filter((doc) => doc.exists)
      .map((doc) => toDomain(doc.data() as OrganizationDoc));
  }

  async save(organization: Organization): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(organization.getOrganizationId())
      .set(toFirestore(organization), { merge: true });
  }
}
