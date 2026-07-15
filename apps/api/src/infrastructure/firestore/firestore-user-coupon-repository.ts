import type { Timestamp } from "firebase-admin/firestore";
import type { CouponType } from "@/domain/coupon/coupon";
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
  amountJPY?: number;
  couponName?: string;
  type?: CouponType;
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
    // 旧データ互換: PR-2 以前の doc は organizationId が無い可能性がある。
    // 空文字で埋め、UI では表示されない古いレコードとして扱う。
    organizationId: doc.organizationId ?? "",
    amountJPY: doc.amountJPY ?? 0,
    couponName: doc.couponName ?? "",
    type: doc.type ?? "welcome",
    receivedAt: toRequiredDate(doc.receivedAt),
    expiresAt: toDate(doc.expiresAt),
    redeemedAt: toDate(doc.redeemedAt),
    redeemedBookingId: doc.redeemedBookingId,
  });
}

function toFirestore(coupon: UserCoupon): UserCouponDoc {
  const expiresAt = coupon.getExpiresAt();
  const redeemedAt = coupon.getRedeemedAt();
  const redeemedBookingId = coupon.getRedeemedBookingId();
  return {
    userCouponId: coupon.getUserCouponId(),
    userId: coupon.getUserId(),
    couponId: coupon.getCouponId(),
    organizationId: coupon.getOrganizationId(),
    amountJPY: coupon.getAmountJPY(),
    couponName: coupon.getCouponName(),
    type: coupon.getType(),
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

  async findByUserIdAndCouponId(
    userId: string,
    couponId: string,
  ): Promise<UserCoupon[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("couponId", "==", couponId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as UserCouponDoc));
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

  async countByCouponId(couponId: string): Promise<number> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("couponId", "==", couponId)
      .count()
      .get();
    return snapshot.data().count;
  }

  async save(coupon: UserCoupon): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(coupon.getUserCouponId())
      .set(toFirestore(coupon));
  }

  async saveMany(coupons: UserCoupon[]): Promise<void> {
    // Firestore batch は 500 write/batch まで
    const BATCH_LIMIT = 500;
    for (let i = 0; i < coupons.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const coupon of coupons.slice(i, i + BATCH_LIMIT)) {
        batch.set(
          db.collection(COLLECTION).doc(coupon.getUserCouponId()),
          toFirestore(coupon),
        );
      }
      await batch.commit();
    }
  }
}
