import type { Timestamp } from "firebase-admin/firestore";
import {
  ConsultantPricePlan,
  type ConsultantPricePlanStatus,
} from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.pricePlans;

interface ConsultantPricePlanDoc {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name: string;
  normalizedName: string;
  totalJPY: number;
  status: ConsultantPricePlanStatus;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  deletedAt?: Timestamp | Date | null;
}

function toDate(value?: Timestamp | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toDomain(doc: ConsultantPricePlanDoc): ConsultantPricePlan {
  return ConsultantPricePlan.reconstruct({
    organizationId: doc.organizationId,
    consultantId: doc.consultantId,
    pricePlanId: doc.pricePlanId,
    name: doc.name,
    totalJPY: doc.totalJPY,
    status: doc.status,
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
    deletedAt: toDate(doc.deletedAt),
  });
}

function toFirestore(pricePlan: ConsultantPricePlan): ConsultantPricePlanDoc {
  return {
    organizationId: pricePlan.getOrganizationId(),
    consultantId: pricePlan.getConsultantId(),
    pricePlanId: pricePlan.getPricePlanId(),
    name: pricePlan.getName(),
    normalizedName: pricePlan.getNormalizedName(),
    totalJPY: pricePlan.getTotalJPY(),
    status: pricePlan.getStatus(),
    createdAt: pricePlan.getCreatedAt(),
    updatedAt: pricePlan.getUpdatedAt(),
    deletedAt: pricePlan.getDeletedAt() ?? null,
  };
}

export class FirestoreConsultantPricePlanRepository
  implements IConsultantPricePlanRepository
{
  async findById(
    organizationId: string,
    pricePlanId: string,
  ): Promise<ConsultantPricePlan | null> {
    const doc = await db.collection(COLLECTION).doc(pricePlanId).get();
    if (!doc.exists) return null;
    const pricePlan = toDomain(doc.data() as ConsultantPricePlanDoc);
    return pricePlan.getOrganizationId() === organizationId ? pricePlan : null;
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) =>
      toDomain(doc.data() as ConsultantPricePlanDoc),
    );
  }

  async findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .where("status", "==", "active")
      .get();
    return snapshot.docs.map((doc) =>
      toDomain(doc.data() as ConsultantPricePlanDoc),
    );
  }

  async findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<ConsultantPricePlan | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", params.organizationId)
      .where("consultantId", "==", params.consultantId)
      .where("normalizedName", "==", params.normalizedName)
      .where("totalJPY", "==", params.totalJPY)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as ConsultantPricePlanDoc);
  }

  async save(pricePlan: ConsultantPricePlan): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(pricePlan.getPricePlanId())
      .set(toFirestore(pricePlan));
  }
}
