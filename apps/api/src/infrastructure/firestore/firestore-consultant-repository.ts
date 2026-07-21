import type { Timestamp } from "firebase-admin/firestore";
import type { Consultant } from "@/domain/consultant/consultant";
import { Consultant as ConsultantEntity } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { DEFAULT_CONSULTANT_STATUS_ID } from "@/domain/settings/consultant-status";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.consultants;

interface ConsultantDoc {
  organizationId: string;
  consultantId: string;
  name: string;
  bio: string;
  specialties: string[];
  phone?: string;
  imageUrl?: string;
  statusId?: string;
  isActive: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

function toDate(value?: Timestamp | Date): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: ConsultantDoc): Consultant {
  const createdAt = toDate(doc.createdAt) ?? new Date(0);
  return ConsultantEntity.reconstruct({
    organizationId: doc.organizationId,
    consultantId: doc.consultantId,
    profile: ConsultantProfile.reconstruct(
      doc.name,
      doc.bio,
      doc.specialties,
      doc.phone ?? "",
      doc.imageUrl,
    ),
    statusId: doc.statusId ?? DEFAULT_CONSULTANT_STATUS_ID,
    isActive: doc.isActive,
    createdAt,
    updatedAt: toDate(doc.updatedAt) ?? createdAt,
  });
}

function toFirestore(consultant: Consultant): ConsultantDoc {
  const profile = consultant.getProfile();
  const imageUrl = profile.getImageUrl();
  return {
    organizationId: consultant.getOrganizationId(),
    consultantId: consultant.getConsultantId(),
    name: profile.getDisplayName(),
    bio: profile.getBio(),
    specialties: [...profile.getSpecialties()],
    phone: profile.getPhone(),
    ...(imageUrl !== undefined && { imageUrl }),
    statusId: consultant.getStatusId(),
    isActive: consultant.getIsActive(),
    createdAt: consultant.getCreatedAt(),
    updatedAt: consultant.getUpdatedAt(),
  };
}

export class FirestoreConsultantRepository implements IConsultantRepository {
  async findById(
    organizationId: string,
    consultantId: string,
  ): Promise<Consultant | null> {
    const doc = await db
      .collection(COLLECTION)
      .doc(`${organizationId}_${consultantId}`)
      .get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as ConsultantDoc);
  }

  async findByIds(
    organizationId: string,
    consultantIds: string[],
  ): Promise<Consultant[]> {
    const uniqueIds = [...new Set(consultantIds)];
    if (uniqueIds.length === 0) return [];
    const refs = uniqueIds.map((consultantId) =>
      db.collection(COLLECTION).doc(`${organizationId}_${consultantId}`),
    );
    const snapshots = await db.getAll(...refs);
    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => toDomain(snapshot.data() as ConsultantDoc));
  }

  async findAllActive(organizationId: string): Promise<Consultant[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("isActive", "==", true)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ConsultantDoc));
  }

  async findAll(organizationId: string): Promise<Consultant[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ConsultantDoc));
  }

  async findOrganizationIdsByConsultantId(
    consultantId: string,
  ): Promise<string[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("consultantId", "==", consultantId)
      .get();
    return [
      ...new Set(
        snapshot.docs.map(
          (doc) => (doc.data() as ConsultantDoc).organizationId,
        ),
      ),
    ];
  }

  async findByConsultantId(consultantId: string): Promise<Consultant[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ConsultantDoc));
  }

  async save(consultant: Consultant): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(`${consultant.getOrganizationId()}_${consultant.getConsultantId()}`)
      .set(toFirestore(consultant));
  }

  async delete(organizationId: string, consultantId: string): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(`${organizationId}_${consultantId}`)
      .delete();
  }
}
