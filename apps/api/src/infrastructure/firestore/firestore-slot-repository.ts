import { isBeforeBookingDeadline } from "@mirai-yoho/shared/slot-availability";
import type { Timestamp } from "firebase-admin/firestore";
import type { Slot } from "@/domain/slot/slot";
import { Slot as SlotEntity } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.slots;

interface SlotDoc {
  organizationId: string;
  slotId: string;
  consultantId: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
  bookingId?: string;
  isAvailable: boolean;
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
    timeRange: TimeRange.reconstruct(
      doc.startsAt.toDate(),
      doc.endsAt.toDate(),
    ),
    bookingId: doc.bookingId,
    isAvailable: doc.isAvailable,
  });
}

function toFirestore(slot: Slot): Record<string, unknown> {
  const timeRange = slot.getTimeRange();
  return {
    organizationId: slot.getOrganizationId(),
    slotId: slot.getSlotId(),
    consultantId: slot.getConsultantId(),
    startsAt: timeRange.getStartsAt(),
    endsAt: timeRange.getEndsAt(),
    bookingId: slot.getBookingId() ?? null,
    isAvailable: slot.getIsAvailable(),
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
        .where("isAvailable", "==", true)
        .get();
      return snapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter((slot) =>
          isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()),
        )
        .sort(
          (a, b) =>
            a.getTimeRange().getStartsAt().getTime() -
            b.getTimeRange().getStartsAt().getTime(),
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
            slot.getIsAvailable() &&
            isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()),
        )
        .sort(
          (a, b) =>
            a.getTimeRange().getStartsAt().getTime() -
            b.getTimeRange().getStartsAt().getTime(),
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
      .filter((slot) => slot.getTimeRange().getStartsAt() > new Date())
      .sort(
        (a, b) =>
          a.getTimeRange().getStartsAt().getTime() -
          b.getTimeRange().getStartsAt().getTime(),
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
        .where("isAvailable", "==", true)
        .where("startsAt", ">", new Date())
        .orderBy("startsAt", "asc")
        .get();
      return snapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter((slot) =>
          isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()),
        );
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
            slot.getIsAvailable() &&
            isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()),
        )
        .sort(
          (a, b) =>
            a.getTimeRange().getStartsAt().getTime() -
            b.getTimeRange().getStartsAt().getTime(),
        );
    }
  }

  async findAvailableByTimeRange(
    organizationId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Slot[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("startsAt", "==", startsAt)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as SlotDoc))
      .filter(
        (slot) =>
          slot.getIsAvailable() &&
          isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()) &&
          slot.getTimeRange().getEndsAt().getTime() === endsAt.getTime(),
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
        .where("startsAt", ">=", start)
        .where("startsAt", "<", end)
        .orderBy("startsAt", "asc")
        .get();
      return snapshot.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter(
          (slot) =>
            slot.getIsAvailable() &&
            isBeforeBookingDeadline(slot.getTimeRange().getStartsAt()),
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
        .filter((slot) => {
          if (!slot.getIsAvailable()) return false;
          const startsAt = slot.getTimeRange().getStartsAt().getTime();
          return (
            startsAt >= start.getTime() &&
            startsAt < end.getTime() &&
            isBeforeBookingDeadline(slot.getTimeRange().getStartsAt())
          );
        })
        .sort(
          (a, b) =>
            a.getTimeRange().getStartsAt().getTime() -
            b.getTimeRange().getStartsAt().getTime(),
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
