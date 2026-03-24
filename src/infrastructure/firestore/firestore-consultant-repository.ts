import type { Consultant } from "@/domain/consultant/consultant";
import { Consultant as ConsultantEntity } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { db } from "@/infrastructure/firestore/firestore-client";

const COLLECTION = "consultants";

interface ConsultantDoc {
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
  zoomRoomIds: string[];
  isActive: boolean;
}

function toDomain(doc: ConsultantDoc): Consultant {
  return ConsultantEntity.reconstruct({
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
    consultantId: consultant.getConsultantId(),
    displayName: profile.getDisplayName(),
    bio: profile.getBio(),
    specialties: [...profile.getSpecialties()],
    zoomRoomIds: consultant.getZoomRoomIds(),
    isActive: consultant.getIsActive(),
  };
}

export class FirestoreConsultantRepository implements IConsultantRepository {
  async findById(consultantId: string): Promise<Consultant | null> {
    const doc = await db.collection(COLLECTION).doc(consultantId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as ConsultantDoc);
  }

  async findAllActive(): Promise<Consultant[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as ConsultantDoc));
  }

  async save(consultant: Consultant): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(consultant.getConsultantId())
      .set(toFirestore(consultant));
  }
}
