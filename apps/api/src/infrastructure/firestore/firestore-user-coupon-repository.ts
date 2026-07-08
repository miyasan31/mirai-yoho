import type { Timestamp } from "firebase-admin/firestore";
import { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.userCoupons;

interface UserCouponDoc {
  userCouponId: string;
  userId: string;
  couponId: string;
  organizationId?: string;
  receivedAt: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  redeemedAt?: Timestamp | Date;
  redeemedBookingId?: string;
}

function toDate(value: Timestamp | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toRequiredDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

function toDomain(doc: UserCouponDoc): UserCoupon {
  return UserCoupon.reconstruct({
    userCouponId: doc.userCouponId,
    userId: doc.userId,
    couponId: doc.couponId,
    organizationId: doc.organizationId,
    receivedAt: toRequiredDate(doc.receivedAt),
    expiresAt: toDate(doc.expiresAt),
    redeemedAt: toDate(doc.redeemedAt),
    redeemedBookingId: doc.redeemedBookingId,
  });
}

function toFirestore(coupon: UserCoupon): UserCouponDoc {
  const organizationId = coupon.getOrganizationId();
  const expiresAt = coupon.getExpiresAt();
  const redeemedAt = coupon.getRedeemedAt();
  const redeemedBookingId = coupon.getRedeemedBookingId();
  return {
    userCouponId: coupon.getUserCouponId(),
    userId: coupon.getUserId(),
    couponId: coupon.getCouponId(),
    ...(organizationId !== undefined ? { organizationId } : {}),
    receivedAt: coupon.getReceivedAt(),
    ...(expiresAt ? { expiresAt } : {}),
    ...(redeemedAt ? { redeemedAt } : {}),
    ...(redeemedBookingId !== undefined ? { redeemedBookingId } : {}),
  };
}

export class FirestoreUserCouponRepository implements IUserCouponRepository {
  async findById(userCouponId: string): Promise<UserCoupon | null> {
    const doc = await db.collection(COLLECTION).doc(userCouponId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as UserCouponDoc);
  }

  async findByUserId(userId: string): Promise<UserCoupon[]> {
    // orderBy を組み合わせると複合インデックスが必要になるため、メモリ内でソートする
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as UserCouponDoc))
      .sort(
        (a, b) => b.getReceivedAt().getTime() - a.getReceivedAt().getTime(),
      );
  }

  async findRedeemableByUserId(
    userId: string,
    now: Date,
  ): Promise<UserCoupon[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as UserCouponDoc))
      .filter((coupon) => coupon.isRedeemable(now));
  }

  async save(coupon: UserCoupon): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(coupon.getUserCouponId())
      .set(toFirestore(coupon));
  }
}
