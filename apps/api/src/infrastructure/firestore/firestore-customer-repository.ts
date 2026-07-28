import { FieldPath, type Timestamp } from "firebase-admin/firestore";
import type { Customer } from "@/domain/customer/customer";
import { Customer as CustomerEntity } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { chunkArray } from "@/lib/chunk-array";

const COLLECTION = FIRESTORE_COLLECTIONS.customers;
const FIRESTORE_IN_QUERY_CHUNK_SIZE = 10;

interface CustomerDoc {
  organizationId: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  note?: string;
  userId?: string;
  guardianName?: string;
  guardianConsentedAt?: Timestamp | Date;
  withdrawnAt?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

function toDate(value?: Timestamp | Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: CustomerDoc): Customer {
  const createdAt = toDate(doc.createdAt) ?? new Date(0);
  return CustomerEntity.reconstruct({
    organizationId: doc.organizationId,
    customerId: doc.customerId,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    birthDate: doc.birthDate,
    note: doc.note,
    userId: doc.userId,
    guardianName: doc.guardianName,
    guardianConsentedAt: toDate(doc.guardianConsentedAt) ?? undefined,
    withdrawnAt: toDate(doc.withdrawnAt) ?? undefined,
    createdAt,
    updatedAt: toDate(doc.updatedAt) ?? createdAt,
  });
}

function toFirestore(customer: Customer): CustomerDoc {
  const note = customer.getNote();
  const userId = customer.getUserId();
  const guardianName = customer.getGuardianName();
  const guardianConsentedAt = customer.getGuardianConsentedAt();
  const withdrawnAt = customer.getWithdrawnAt();
  return {
    organizationId: customer.getOrganizationId(),
    customerId: customer.getCustomerId(),
    name: customer.getName(),
    email: customer.getEmail(),
    phone: customer.getPhone(),
    ...(customer.getBirthDate() ? { birthDate: customer.getBirthDate() } : {}),
    ...(note !== undefined ? { note } : {}),
    ...(userId !== undefined ? { userId } : {}),
    ...(guardianName !== undefined ? { guardianName } : {}),
    ...(guardianConsentedAt !== undefined ? { guardianConsentedAt } : {}),
    ...(withdrawnAt ? { withdrawnAt } : {}),
    createdAt: customer.getCreatedAt(),
    updatedAt: customer.getUpdatedAt(),
  };
}

export class FirestoreCustomerRepository implements ICustomerRepository {
  async findById(
    organizationId: string,
    customerId: string,
  ): Promise<Customer | null> {
    const doc = await db.collection(COLLECTION).doc(customerId).get();
    if (!doc.exists) return null;
    const customer = toDomain(doc.data() as CustomerDoc);
    return customer.getOrganizationId() === organizationId ? customer : null;
  }

  async findByEmail(
    organizationId: string,
    email: string,
  ): Promise<Customer | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as CustomerDoc);
  }

  async findAll(organizationId: string): Promise<Customer[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as CustomerDoc));
  }

  async save(customer: Customer): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(customer.getCustomerId())
      .set(toFirestore(customer));
  }

  async findByIds(
    organizationId: string,
    customerIds: string[],
  ): Promise<Customer[]> {
    const uniqueCustomerIds = [...new Set(customerIds)];
    if (uniqueCustomerIds.length === 0) return [];

    const snapshots = await Promise.all(
      chunkArray(uniqueCustomerIds, FIRESTORE_IN_QUERY_CHUNK_SIZE).map((ids) =>
        db
          .collection(COLLECTION)
          .where(FieldPath.documentId(), "in", ids)
          .get(),
      ),
    );

    const customerById = new Map<string, Customer>();
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        const customer = toDomain(doc.data() as CustomerDoc);
        if (customer.getOrganizationId() !== organizationId) continue;
        customerById.set(customer.getCustomerId(), customer);
      }
    }

    return uniqueCustomerIds
      .map((customerId) => customerById.get(customerId))
      .filter((customer): customer is Customer => customer !== undefined);
  }

  async findByEmailAcrossOrganizations(email: string): Promise<Customer[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("email", "==", email)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as CustomerDoc));
  }

  async findByUserId(userId: string): Promise<Customer[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as CustomerDoc));
  }

  async findByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<Customer | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("organizationId", "==", organizationId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as CustomerDoc);
  }
}
