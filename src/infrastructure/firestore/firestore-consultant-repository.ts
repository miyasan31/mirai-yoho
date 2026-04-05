import type { Consultant } from "@/domain/consultant/consultant";
import { Consultant as ConsultantEntity } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.consultants;

interface ConsultantDoc {
  organizationId: string;
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
  zoomRoomIds: string[];
  isActive: boolean;
}

function toDomain(doc: ConsultantDoc): Consultant {
  return ConsultantEntity.reconstruct({
    organizationId: doc.organizationId,
    consultantId: doc.consultantId,
    profile: ConsultantProfile.reconstruct(
      doc.displayName,
      doc.bio,
      doc.specialties,
    ),
    zoomRoomIds: doc.zoomRoomIds,
    isActive: doc.isActive,
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
    zoomRoomIds: consultant.getZoomRoomIds(),
    isActive: consultant.getIsActive(),
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
