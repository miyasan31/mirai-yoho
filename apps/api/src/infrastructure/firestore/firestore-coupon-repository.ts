import type { Timestamp } from "firebase-admin/firestore";
import { Coupon, type CouponType } from "@/domain/coupon/coupon";
import type { ICouponRepository } from "@/domain/coupon/coupon-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.coupons;

interface CouponDoc {
  organizationId: string;
  couponId: string;
  type: CouponType;
  name: string;
  amountJPY: number;
  batchSize?: number | null;
  totalLimit?: number | null;
  expiresInDays: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  archivedAt?: Timestamp | Date | null;
}

function toDate(value?: Timestamp | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toRequiredDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

function toDomain(doc: CouponDoc): Coupon {
  return Coupon.reconstruct({
    organizationId: doc.organizationId,
    couponId: doc.couponId,
    type: doc.type,
    name: doc.name,
    amountJPY: doc.amountJPY,
    batchSize: doc.batchSize ?? undefined,
    totalLimit: doc.totalLimit ?? undefined,
    expiresInDays: doc.expiresInDays,
    createdAt: toRequiredDate(doc.createdAt),
    updatedAt: toRequiredDate(doc.updatedAt),
    archivedAt: toDate(doc.archivedAt),
  });
}

function toFirestore(coupon: Coupon): CouponDoc {
  return {
    organizationId: coupon.getOrganizationId(),
    couponId: coupon.getCouponId(),
    type: coupon.getType(),
    name: coupon.getName(),
    amountJPY: coupon.getAmountJPY(),
    batchSize: coupon.getBatchSize() ?? null,
    totalLimit: coupon.getTotalLimit() ?? null,
    expiresInDays: coupon.getExpiresInDays(),
    createdAt: coupon.getCreatedAt(),
    updatedAt: coupon.getUpdatedAt(),
    archivedAt: coupon.getArchivedAt() ?? null,
  };
}

export class FirestoreCouponRepository implements ICouponRepository {
  async findById(
    organizationId: string,
    couponId: string,
  ): Promise<Coupon | null> {
    const doc = await db.collection(COLLECTION).doc(couponId).get();
    if (!doc.exists) return null;
    const coupon = toDomain(doc.data() as CouponDoc);
    return coupon.getOrganizationId() === organizationId ? coupon : null;
  }

  async findByOrganizationId(organizationId: string): Promise<Coupon[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as CouponDoc))
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
  }

  async save(coupon: Coupon): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(coupon.getCouponId())
      .set(toFirestore(coupon));
  }
}
