import type { Timestamp } from "firebase-admin/firestore";
import type { Consultant } from "@/domain/consultant/consultant";
import { Consultant as ConsultantEntity } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { DEFAULT_CONSULTANT_RANK_ID } from "@/domain/organization-settings/consultant-rank";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.consultants;

interface ConsultantDoc {
  organizationId: string;
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
  imageUrl?: string;
  zoomRoomIds: string[];
  rankId?: string;
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
      doc.displayName,
      doc.bio,
      doc.specialties,
      doc.imageUrl,
    ),
    zoomRoomIds: doc.zoomRoomIds,
    rankId: doc.rankId ?? DEFAULT_CONSULTANT_RANK_ID,
    isActive: doc.isActive,
    createdAt,
    updatedAt: toDate(doc.updatedAt) ?? createdAt,
  });
}

function toFirestore(consultant: Consultant): ConsultantDoc {
  const profile = consultant.getProfile();
  return {
    organizationId: consultant.getOrganizationId(),
    consultantId: consultant.getConsultantId(),
    displayName: profile.getDisplayName(),
    bio: profile.getBio(),
    specialties: [...profile.getSpecialties()],
    imageUrl: profile.getImageUrl(),
    zoomRoomIds: consultant.getZoomRoomIds(),
    rankId: consultant.getRankId(),
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
