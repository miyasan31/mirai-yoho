import {
  getSlotUnitMs,
  isBeforeBookingDeadline,
} from "@mirai-yoho/shared/slot-availability";
import type { Timestamp } from "firebase-admin/firestore";
import type { TransactionScope } from "@/domain/shared/transaction-scope";
import type { Slot } from "@/domain/slot/slot";
import { Slot as SlotEntity } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";
import { toFirestoreTransaction } from "@/infrastructure/firestore/firestore-transaction-scope";

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

  async findByIdsInTx(
    organizationId: string,
    slotIds: readonly string[],
    tx: TransactionScope,
  ): Promise<Slot[]> {
    if (slotIds.length === 0) return [];
    const transaction = toFirestoreTransaction(tx);
    const refs = slotIds.map((id) => db.collection(COLLECTION).doc(id));
    const snapshots = await transaction.getAll(...refs);
    const slots: Slot[] = [];
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const slot = toDomain(snapshot.data() as SlotDoc);
      if (slot.getOrganizationId() !== organizationId) continue;
      slots.push(slot);
    }
    return slots;
  }

  async findAvailableChainByConsultant(
    organizationId: string,
    consultantId: string,
    startsAt: Date,
    requiredCount: number,
  ): Promise<Slot[] | null> {
    if (requiredCount <= 0) return [];
    const slotUnitMs = getSlotUnitMs();
    const endBoundary = new Date(
      startsAt.getTime() + requiredCount * slotUnitMs,
    );
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("consultantId", "==", consultantId)
        .where("startsAt", ">=", startsAt)
        .where("startsAt", "<", endBoundary)
        .orderBy("startsAt", "asc")
        .get();
      const slots = snapshot.docs.map((doc) => toDomain(doc.data() as SlotDoc));
      return this.validateChain(slots, startsAt, requiredCount);
    } catch (error) {
      if (!isFirestoreFailedPrecondition(error)) {
        throw error;
      }
      const fallback = await db
        .collection(COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("consultantId", "==", consultantId)
        .get();
      const slots = fallback.docs
        .map((doc) => toDomain(doc.data() as SlotDoc))
        .filter((slot) => {
          const t = slot.getTimeRange().getStartsAt().getTime();
          return t >= startsAt.getTime() && t < endBoundary.getTime();
        })
        .sort(
          (a, b) =>
            a.getTimeRange().getStartsAt().getTime() -
            b.getTimeRange().getStartsAt().getTime(),
        );
      return this.validateChain(slots, startsAt, requiredCount);
    }
  }

  private validateChain(
    slots: readonly Slot[],
    startsAt: Date,
    requiredCount: number,
  ): Slot[] | null {
    const slotUnitMs = getSlotUnitMs();
    if (slots.length !== requiredCount) return null;
    for (let i = 0; i < requiredCount; i++) {
      const expected = startsAt.getTime() + i * slotUnitMs;
      const slot = slots[i];
      if (slot.getTimeRange().getStartsAt().getTime() !== expected) return null;
      if (!slot.getIsAvailable()) return null;
      if (!isBeforeBookingDeadline(slot.getTimeRange().getStartsAt())) {
        return null;
      }
    }
    return [...slots];
  }

  async save(slot: Slot): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(slot.getSlotId())
      .set(toFirestore(slot));
  }

  async saveInTx(slot: Slot, tx: TransactionScope): Promise<void> {
    const transaction = toFirestoreTransaction(tx);
    transaction.set(
      db.collection(COLLECTION).doc(slot.getSlotId()),
      toFirestore(slot),
    );
  }

  async delete(organizationId: string, slotId: string): Promise<void> {
    const slot = await this.findById(organizationId, slotId);
    if (!slot) return;
    await db.collection(COLLECTION).doc(slotId).delete();
  }
}
