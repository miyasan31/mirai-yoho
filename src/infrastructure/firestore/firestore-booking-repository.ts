import type { Timestamp } from "firebase-admin/firestore";
import type { Booking } from "@/domain/booking/booking";
import { Booking as BookingEntity } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.bookings;

interface BookingDoc {
  organizationId: string;
  bookingId: string;
  clientId: string;
  consultantId: string;
  slotId: string;
  startDatetime: Timestamp;
  status: string;
  cancelDeadline: Timestamp;
  zoomUrl?: string;
  consultantJoinedAt?: Timestamp;
  lateArrivalAlertSentAt?: Timestamp;
  consultantMemo: string;
  consultationContent?: string;
  pricePlanId?: string;
  pricePlanName?: string;
  pricePlanTotalJPY?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function toDomain(doc: BookingDoc): Booking {
  const createdAt = doc.createdAt?.toDate() ?? new Date(0);
  return BookingEntity.reconstruct({
    organizationId: doc.organizationId,
    bookingId: doc.bookingId,
    clientId: doc.clientId,
    consultantId: doc.consultantId,
    slotId: doc.slotId,
    startDatetime: doc.startDatetime.toDate(),
    status: BookingStatus.reconstruct(doc.status),
    cancelDeadline: CancelDeadline.reconstruct(doc.cancelDeadline.toDate()),
    zoomUrl: doc.zoomUrl ? ZoomUrl.reconstruct(doc.zoomUrl) : undefined,
    consultantJoinedAt: doc.consultantJoinedAt?.toDate(),
    lateArrivalAlertSentAt: doc.lateArrivalAlertSentAt?.toDate(),
    consultantMemo: ConsultantMemo.reconstruct(doc.consultantMemo),
    consultationContent: doc.consultationContent,
    pricePlanId: doc.pricePlanId,
    pricePlanName: doc.pricePlanName,
    pricePlanTotalJPY: doc.pricePlanTotalJPY,
    createdAt,
    updatedAt: doc.updatedAt?.toDate() ?? createdAt,
  });
}

function toFirestore(booking: Booking): Record<string, unknown> {
  return {
    organizationId: booking.getOrganizationId(),
    bookingId: booking.getBookingId(),
    clientId: booking.getClientId(),
    consultantId: booking.getConsultantId(),
    slotId: booking.getSlotId(),
    startDatetime: booking.getStartDatetime(),
    status: booking.getStatus().getValue(),
    cancelDeadline: booking.getCancelDeadline().getValue(),
    zoomUrl: booking.getZoomUrl()?.getValue() ?? null,
    consultantJoinedAt: booking.getConsultantJoinedAt() ?? null,
    lateArrivalAlertSentAt: booking.getLateArrivalAlertSentAt() ?? null,
    consultantMemo: booking.getConsultantMemo().getValue(),
    consultationContent: booking.getConsultationContent() ?? null,
    pricePlanId: booking.getPricePlanId() ?? null,
    pricePlanName: booking.getPricePlanName() ?? null,
    pricePlanTotalJPY: booking.getPricePlanTotalJPY() ?? null,
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
}
