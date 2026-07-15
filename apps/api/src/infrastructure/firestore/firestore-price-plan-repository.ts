import type { Timestamp } from "firebase-admin/firestore";
import { PricePlan } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.pricePlans;

interface PricePlanDoc {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name: string;
  normalizedName: string;
  totalJPY: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  archivedAt?: Timestamp | Date | null;
}

function toDate(value?: Timestamp | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: PricePlanDoc): PricePlan {
  return PricePlan.reconstruct({
    organizationId: doc.organizationId,
    consultantId: doc.consultantId,
    pricePlanId: doc.pricePlanId,
    name: doc.name,
    totalJPY: doc.totalJPY,
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
    archivedAt: toDate(doc.archivedAt),
  });
}

function toFirestore(pricePlan: PricePlan): PricePlanDoc {
  return {
    organizationId: pricePlan.getOrganizationId(),
    consultantId: pricePlan.getConsultantId(),
    pricePlanId: pricePlan.getPricePlanId(),
    name: pricePlan.getName(),
    normalizedName: pricePlan.getNormalizedName(),
    totalJPY: pricePlan.getTotalJPY(),
    createdAt: pricePlan.getCreatedAt(),
    updatedAt: pricePlan.getUpdatedAt(),
    archivedAt: pricePlan.getArchivedAt() ?? null,
  };
}

export class FirestorePricePlanRepository implements IPricePlanRepository {
  async findById(
    organizationId: string,
    pricePlanId: string,
  ): Promise<PricePlan | null> {
    const doc = await db.collection(COLLECTION).doc(pricePlanId).get();
    if (!doc.exists) return null;
    const pricePlan = toDomain(doc.data() as PricePlanDoc);
    return pricePlan.getOrganizationId() === organizationId ? pricePlan : null;
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as PricePlanDoc));
  }

  async findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .where("archivedAt", "==", null)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as PricePlanDoc));
  }

  async findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<PricePlan | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", params.organizationId)
      .where("consultantId", "==", params.consultantId)
      .where("normalizedName", "==", params.normalizedName)
      .where("totalJPY", "==", params.totalJPY)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PricePlanDoc);
  }

  async save(pricePlan: PricePlan): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(pricePlan.getPricePlanId())
      .set(toFirestore(pricePlan));
  }
}
