import type { Timestamp } from "firebase-admin/firestore";
import type { Slot } from "@/domain/slot/slot";
import { Slot as SlotEntity } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { db } from "@/infrastructure/firestore/firestore-client";

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

function getJstDayRange(date: Date): { start: Date; end: Date } {
  const nineHoursInMs = 9 * 60 * 60 * 1000;
  const shifted = new Date(date.getTime() + nineHoursInMs);
  const startUtcMs =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - nineHoursInMs;

  return {
    start: new Date(startUtcMs),
    end: new Date(startUtcMs + 24 * 60 * 60 * 1000),
  };
}

export class FirestoreSlotRepository implements ISlotRepository {
  async findById(slotId: string): Promise<Slot | null> {
    const doc = await db.collection(COLLECTION).doc(slotId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as SlotDoc);
  }

  async findAllAvailable(): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("isReserved", "==", false)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as SlotDoc))
      .filter((slot) => slot.getTimeRange().getStartAt() > new Date())
      .sort(
        (a, b) =>
          a.getTimeRange().getStartAt().getTime() -
          b.getTimeRange().getStartAt().getTime(),
      );
  }

  async findByConsultantId(consultantId: string): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as SlotDoc))
      .filter((slot) => slot.getTimeRange().getStartAt() > new Date())
      .sort(
        (a, b) =>
          a.getTimeRange().getStartAt().getTime() -
          b.getTimeRange().getStartAt().getTime(),
      );
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

  async findAvailableByTimeRange(startAt: Date, endAt: Date): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("startAt", "==", startAt)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as SlotDoc))
      .filter(
        (slot) =>
          !slot.getIsReserved() &&
          slot.getTimeRange().getEndAt().getTime() === endAt.getTime(),
      )
      .sort((a, b) => a.getConsultantId().localeCompare(b.getConsultantId()));
  }

  async findAvailableByDate(date: Date): Promise<Slot[]> {
    const { start, end } = getJstDayRange(date);
    const snapshot = await db
      .collection(COLLECTION)
      .where("startAt", ">=", start)
      .where("startAt", "<", end)
      .orderBy("startAt", "asc")
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as SlotDoc))
      .filter((slot) => !slot.getIsReserved());
  }

  async save(slot: Slot): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(slot.getSlotId())
      .set(toFirestore(slot));
  }

  async delete(slotId: string): Promise<void> {
    await db.collection(COLLECTION).doc(slotId).delete();
  }
}
