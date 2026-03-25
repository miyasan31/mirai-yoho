import type { Timestamp } from "firebase-admin/firestore";
import type { Booking } from "@/domain/booking/booking";
import { Booking as BookingEntity } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { db } from "@/infrastructure/firestore/firestore-client";

const COLLECTION = "bookings";

interface BookingDoc {
  bookingId: string;
  clientId: string;
  consultantId: string;
  slotId: string;
  startDatetime: Timestamp;
  status: string;
  cancelDeadline: Timestamp;
  zoomUrl?: string;
  consultantMemo: string;
  consultationContent?: string;
}

function toDomain(doc: BookingDoc): Booking {
  return BookingEntity.reconstruct({
    bookingId: doc.bookingId,
    clientId: doc.clientId,
    consultantId: doc.consultantId,
    slotId: doc.slotId,
    startDatetime: doc.startDatetime.toDate(),
    status: BookingStatus.reconstruct(doc.status),
    cancelDeadline: CancelDeadline.reconstruct(doc.cancelDeadline.toDate()),
    zoomUrl: doc.zoomUrl ? ZoomUrl.reconstruct(doc.zoomUrl) : undefined,
    consultantMemo: ConsultantMemo.reconstruct(doc.consultantMemo),
    consultationContent: doc.consultationContent,
  });
}

function toFirestore(booking: Booking): Record<string, unknown> {
  return {
    bookingId: booking.getBookingId(),
    clientId: booking.getClientId(),
    consultantId: booking.getConsultantId(),
    slotId: booking.getSlotId(),
    startDatetime: booking.getStartDatetime(),
    status: booking.getStatus().getValue(),
    cancelDeadline: booking.getCancelDeadline().getValue(),
    zoomUrl: booking.getZoomUrl()?.getValue() ?? null,
    consultantMemo: booking.getConsultantMemo().getValue(),
    consultationContent: booking.getConsultationContent() ?? null,
  };
}

export class FirestoreBookingRepository implements IBookingRepository {
  async findById(bookingId: string): Promise<Booking | null> {
    const doc = await db.collection(COLLECTION).doc(bookingId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as BookingDoc);
  }

  async findByConsultantId(consultantId: string): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findByStatus(status: string): Promise<Booking[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", status)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async findAll(): Promise<Booking[]> {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as BookingDoc));
  }

  async save(booking: Booking): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(booking.getBookingId())
      .set(toFirestore(booking));
  }
}
