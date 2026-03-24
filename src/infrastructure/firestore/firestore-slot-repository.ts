import type { Slot } from "@/domain/slot/slot";
import { Slot as SlotEntity } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { db } from "@/infrastructure/firestore/firestore-client";
import type { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "slots";

interface SlotDoc {
  slotId: string;
  consultantId: string;
  startAt: Timestamp;
  endAt: Timestamp;
  bookingId?: string;
  isReserved: boolean;
}

function toDomain(doc: SlotDoc): Slot {
  return SlotEntity.reconstruct({
    slotId: doc.slotId,
    consultantId: doc.consultantId,
    timeRange: TimeRange.reconstruct(doc.startAt.toDate(), doc.endAt.toDate()),
    bookingId: doc.bookingId,
    isReserved: doc.isReserved,
  });
}

function toFirestore(slot: Slot): Record<string, unknown> {
  const timeRange = slot.getTimeRange();
  return {
    slotId: slot.getSlotId(),
    consultantId: slot.getConsultantId(),
    startAt: timeRange.getStartAt(),
    endAt: timeRange.getEndAt(),
    bookingId: slot.getBookingId() ?? null,
    isReserved: slot.getIsReserved(),
  };
}

export class FirestoreSlotRepository implements ISlotRepository {
  async findById(slotId: string): Promise<Slot | null> {
    const doc = await db.collection(COLLECTION).doc(slotId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as SlotDoc);
  }

  async findAvailableByConsultantId(consultantId: string): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("consultantId", "==", consultantId)
      .where("isReserved", "==", false)
      .where("startAt", ">", new Date())
      .orderBy("startAt", "asc")
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as SlotDoc));
  }

  async save(slot: Slot): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(slot.getSlotId())
      .set(toFirestore(slot));
  }
}
