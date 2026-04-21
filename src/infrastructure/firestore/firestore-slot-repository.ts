import type { Timestamp } from "firebase-admin/firestore";
import type { Slot } from "@/domain/slot/slot";
import { Slot as SlotEntity } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.slots;

interface SlotDoc {
  organizationId: string;
  slotId: string;
  consultantId: string;
  startAt: Timestamp;
  endAt: Timestamp;
  bookingId?: string;
  isReserved: boolean;
}

function isFirestoreFailedPrecondition(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = candidate.code;
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    code === 9 ||
    code === "9" ||
    code === "failed-precondition" ||
    code === "FAILED_PRECONDITION" ||
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index")
  );
}

function toDomain(doc: SlotDoc): Slot {
  return SlotEntity.reconstruct({
    organizationId: doc.organizationId,
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
    organizationId: slot.getOrganizationId(),
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
  async findById(organizationId: string, slotId: string): Promise<Slot | null> {
    const doc = await db.collection(COLLECTION).doc(slotId).get();
    if (!doc.exists) return null;
    const slot = toDomain(doc.data() as SlotDoc);
    return slot.getOrganizationId() === organizationId ? slot : null;
  }

  async findByOrganizationId(organizationId: string): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    return snapshot.docs.map((doc) => toDomain(doc.data() as SlotDoc));
  }

  async findAllAvailable(organizationId: string): Promise<Slot[]> {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
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
    } catch (error) {
      if (!isFirestoreFailedPrecondition(error)) {
        throw error;
      }

      const fallbackSnapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .get();
      return fallbackSnapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter(
          (slot) =>
            !slot.getIsReserved() &&
            slot.getTimeRange().getStartAt() > new Date(),
        )
        .sort(
          (a, b) =>
            a.getTimeRange().getStartAt().getTime() -
            b.getTimeRange().getStartAt().getTime(),
        );
    }
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
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

  async findAvailableByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Slot[]> {
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("consultantId", "==", consultantId)
        .where("isReserved", "==", false)
        .where("startAt", ">", new Date())
        .orderBy("startAt", "asc")
        .get();
      return snapshot.docs.map((doc) => toDomain(doc.data() as SlotDoc));
    } catch (error) {
      if (!isFirestoreFailedPrecondition(error)) {
        throw error;
      }

      const fallbackSnapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("consultantId", "==", consultantId)
        .get();
      return fallbackSnapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter(
          (slot) =>
            !slot.getIsReserved() &&
            slot.getTimeRange().getStartAt() > new Date(),
        )
        .sort(
          (a, b) =>
            a.getTimeRange().getStartAt().getTime() -
            b.getTimeRange().getStartAt().getTime(),
        );
    }
  }

  async findAvailableByTimeRange(
    organizationId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
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

  async findAvailableByDate(
    organizationId: string,
    date: Date,
  ): Promise<Slot[]> {
    const { start, end } = getJstDayRange(date);
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("startAt", ">=", start)
        .where("startAt", "<", end)
        .orderBy("startAt", "asc")
        .get();
      return snapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter((slot) => !slot.getIsReserved());
    } catch (error) {
      if (!isFirestoreFailedPrecondition(error)) {
        throw error;
      }

      const fallbackSnapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .get();
      return fallbackSnapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter((slot) => {
          if (slot.getIsReserved()) return false;
          const startAt = slot.getTimeRange().getStartAt().getTime();
          return startAt >= start.getTime() && startAt < end.getTime();
        })
        .sort(
          (a, b) =>
            a.getTimeRange().getStartAt().getTime() -
            b.getTimeRange().getStartAt().getTime(),
        );
    }
  }

  async save(slot: Slot): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(slot.getSlotId())
      .set(toFirestore(slot));
  }

  async delete(organizationId: string, slotId: string): Promise<void> {
    const slot = await this.findById(organizationId, slotId);
    if (!slot) return;
    await db.collection(COLLECTION).doc(slotId).delete();
  }
}
