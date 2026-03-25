import type { Timestamp } from "firebase-admin/firestore";
import { BlockedTime } from "@/domain/blocked-time/blocked-time";
import type { IBlockedTimeRepository } from "@/domain/blocked-time/blocked-time-repository";
import { TimeRange } from "@/domain/slot/time-range";
import { db } from "@/infrastructure/firestore/firestore-client";

interface BlockedTimeDoc {
  blockedTimeId: string;
  consultantId: string;
  startAt: Timestamp;
  endAt: Timestamp;
}

function toDomain(doc: BlockedTimeDoc): BlockedTime {
  return BlockedTime.reconstruct({
    blockedTimeId: doc.blockedTimeId,
    consultantId: doc.consultantId,
    timeRange: TimeRange.reconstruct(doc.startAt.toDate(), doc.endAt.toDate()),
  });
}

function toFirestore(blockedTime: BlockedTime) {
  return {
    blockedTimeId: blockedTime.getBlockedTimeId(),
    consultantId: blockedTime.getConsultantId(),
    startAt: blockedTime.getTimeRange().getStartAt(),
    endAt: blockedTime.getTimeRange().getEndAt(),
  };
}

export class FirestoreBlockedTimeRepository implements IBlockedTimeRepository {
  private collection = db.collection("blockedTimes");

  async findByConsultantId(consultantId: string): Promise<BlockedTime[]> {
    const snapshot = await this.collection
      .where("consultantId", "==", consultantId)
      .orderBy("startAt", "asc")
      .get();

    return snapshot.docs.map((doc) => toDomain(doc.data() as BlockedTimeDoc));
  }

  async save(blockedTime: BlockedTime): Promise<void> {
    await this.collection
      .doc(blockedTime.getBlockedTimeId())
      .set(toFirestore(blockedTime));
  }

  async delete(blockedTimeId: string): Promise<void> {
    await this.collection.doc(blockedTimeId).delete();
  }
}
