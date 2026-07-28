import {
  isSupportedDuration,
  type SupportedDurationMinutes,
} from "@mirai-yoho/shared/slot-availability";
import type { Timestamp } from "firebase-admin/firestore";
import type { Booking } from "@/domain/booking/booking";
import { Booking as BookingEntity } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import type { TransactionScope } from "@/domain/shared/transaction-scope";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { toFirestoreTransaction } from "@/infrastructure/firestore/firestore-transaction-scope";

const COLLECTION = FIRESTORE_COLLECTIONS.bookings;

interface BookingDoc {
  organizationId: string;
  bookingId: string;
  customerId: string;
  consultantId: string;
  usageSlotIds: string[];
  bufferSlotIds: string[];
  startsAt: Timestamp;
  endsAt: Timestamp;
  durationMinutes: number;
  status: string;
  cancelDeadlineAt: Timestamp;
  joinUrl?: string;
  consultantJoinedAt?: Timestamp;
  consultationReminderEmailSentAt?: Timestamp;
  lateArrivalAlertSentAt?: Timestamp;
  consultantMemo: string;
  memoCustomerName?: string;
  memoBirthDate?: string;
  memoAppraisalDate?: string;
  consultationContent?: string;
  pricePlanId?: string;
  pricePlanName?: string;
  pricePlanTotalJPY?: number;
  appliedUserCouponId?: string;
  couponDiscountJPY?: number;
  discountedTotalJPY?: number;
  agreedTermsVersion?: string;
  agreedCancellationPolicyVersion?: string;
  agreedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function assertSupportedDuration(value: number): SupportedDurationMinutes {
  if (!isSupportedDuration(value)) {
    throw new Error(
      `Stored booking has unsupported durationMinutes=${value}. Data reset is required.`,
    );
  }
  return value;
}

function toDomain(doc: BookingDoc): Booking {
  const createdAt = doc.createdAt?.toDate() ?? new Date(0);
  return BookingEntity.reconstruct({
    organizationId: doc.organizationId,
    bookingId: doc.bookingId,
    customerId: doc.customerId,
    consultantId: doc.consultantId,
    usageSlotIds: doc.usageSlotIds ?? [],
    bufferSlotIds: doc.bufferSlotIds ?? [],
    startsAt: doc.startsAt.toDate(),
    endsAt: doc.endsAt.toDate(),
    durationMinutes: assertSupportedDuration(doc.durationMinutes),
    status: BookingStatus.reconstruct(doc.status),
    cancelDeadlineAt: CancelDeadline.reconstruct(doc.cancelDeadlineAt.toDate()),
    joinUrl: doc.joinUrl ? ZoomUrl.reconstruct(doc.joinUrl) : undefined,
    consultantJoinedAt: doc.consultantJoinedAt?.toDate(),
    consultationReminderEmailSentAt:
      doc.consultationReminderEmailSentAt?.toDate(),
    lateArrivalAlertSentAt: doc.lateArrivalAlertSentAt?.toDate(),
    consultantMemo: ConsultantMemo.reconstruct({
      customerName: doc.memoCustomerName ?? "",
      birthDate: doc.memoBirthDate ?? "",
      appraisalDate: doc.memoAppraisalDate ?? "",
      freeMemo: doc.consultantMemo,
    }),
    consultationContent: doc.consultationContent,
    pricePlanId: doc.pricePlanId,
    pricePlanName: doc.pricePlanName,
    pricePlanTotalJPY: doc.pricePlanTotalJPY,
    appliedUserCouponId: doc.appliedUserCouponId,
    couponDiscountJPY: doc.couponDiscountJPY,
    discountedTotalJPY: doc.discountedTotalJPY,
    agreedTermsVersion: doc.agreedTermsVersion,
    agreedCancellationPolicyVersion: doc.agreedCancellationPolicyVersion,
    agreedAt: doc.agreedAt?.toDate(),
    createdAt,
    updatedAt: doc.updatedAt?.toDate() ?? createdAt,
  });
}

function toFirestore(booking: Booking): Record<string, unknown> {
  return {
    organizationId: booking.getOrganizationId(),
    bookingId: booking.getBookingId(),
    customerId: booking.getCustomerId(),
    consultantId: booking.getConsultantId(),
    usageSlotIds: [...booking.getUsageSlotIds()],
    bufferSlotIds: [...booking.getBufferSlotIds()],
    startsAt: booking.getStartsAt(),
    endsAt: booking.getEndsAt(),
    durationMinutes: booking.getDurationMinutes(),
    status: booking.getStatus().getValue(),
    cancelDeadlineAt: booking.getCancelDeadlineAt().getValue(),
    joinUrl: booking.getJoinUrl()?.getValue() ?? null,
    consultantJoinedAt: booking.getConsultantJoinedAt() ?? null,
    consultationReminderEmailSentAt:
      booking.getConsultationReminderEmailSentAt() ?? null,
    lateArrivalAlertSentAt: booking.getLateArrivalAlertSentAt() ?? null,
    consultantMemo: booking.getConsultantMemo().getFreeMemo(),
    memoCustomerName: booking.getConsultantMemo().getCustomerName(),
    memoBirthDate: booking.getConsultantMemo().getBirthDate(),
    memoAppraisalDate: booking.getConsultantMemo().getAppraisalDate(),
    consultationContent: booking.getConsultationContent() ?? null,
    pricePlanId: booking.getPricePlanId() ?? null,
    pricePlanName: booking.getPricePlanName() ?? null,
    pricePlanTotalJPY: booking.getPricePlanTotalJPY() ?? null,
    appliedUserCouponId: booking.getAppliedUserCouponId() ?? null,
    couponDiscountJPY: booking.getCouponDiscountJPY() ?? null,
    discountedTotalJPY: booking.getDiscountedTotalJPY() ?? null,
    agreedTermsVersion: booking.getAgreedTermsVersion() ?? null,
    agreedCancellationPolicyVersion:
      booking.getAgreedCancellationPolicyVersion() ?? null,
    agreedAt: booking.getAgreedAt() ?? null,
    createdAt: booking.getCreatedAt(),
    updatedAt: booking.getUpdatedAt(),
  };
}

export class FirestoreBookingRepository implements IBookingRepository {
  async findById(
    organizationId: string,
    bookingId: string,
  ): Promise<Booking | null> {
    const doc = await db.collection(COLLECTION).doc(bookingId).get();
    if (!doc.exists) return null;
    const booking = toDomain(doc.data() as BookingDoc);
    return booking.getOrganizationId() === organizationId ? booking : null;
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findByCustomerId(
    organizationId: string,
    customerId: string,
  ): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("customerId", "==", customerId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findAllByCustomerId(customerId: string): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("customerId", "==", customerId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findAllByCustomerIds(customerIds: string[]): Promise<Booking[]> {
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) return [];
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
    }
    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        db.collection(COLLECTION).where("customerId", "in", chunk).get(),
      ),
    );
    return snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc)),
    );
  }

  async findByStatus(
    organizationId: string,
    status: string,
  ): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("status", "==", status)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findConsultationReminderTargets(
    organizationId: string,
    now: Date,
    windowEnd: Date,
  ): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("status", "==", "confirmed")
      .where("startsAt", ">", now)
      .where("startsAt", "<=", windowEnd)
      .get();

    return snapshot.docs
      .map((doc) => toDomain(doc.data() as BookingDoc))
      .filter((booking) => !booking.getConsultationReminderEmailSentAt());
  }

  async findAll(organizationId: string): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async save(booking: Booking): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(booking.getBookingId())
      .set(toFirestore(booking));
  }

  async saveInTx(booking: Booking, tx: TransactionScope): Promise<void> {
    const transaction = toFirestoreTransaction(tx);
    transaction.set(
      db.collection(COLLECTION).doc(booking.getBookingId()),
      toFirestore(booking),
    );
  }
}
