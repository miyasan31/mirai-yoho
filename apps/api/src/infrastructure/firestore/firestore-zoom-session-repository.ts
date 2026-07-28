import type { Timestamp } from "firebase-admin/firestore";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";
import type { ZoomSession } from "@/domain/zoom-session/zoom-session";
import { ZoomSession as ZoomSessionEntity } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.zoomSessions;

interface BreakoutRoomDoc {
  bookingId: string;
  consultantId: string;
  roomName: string;
  customerEmail: string;
}

/** `bookingId` 導入前の形式。`scripts/migrate-zoom-session-breakout-rooms.ts` で移行する */
interface LegacyBreakoutRoomDoc {
  consultantId: string;
  roomName: string;
  participantEmails: string[];
}

interface ZoomSessionDoc {
  organizationId: string;
  sessionId: string;
  sessionDate: string;
  zoomMeetingId: string;
  joinUrl: string;
  breakoutRooms: Array<BreakoutRoomDoc | LegacyBreakoutRoomDoc>;
  createdAt: Timestamp;
}

function isCurrentRoom(
  room: BreakoutRoomDoc | LegacyBreakoutRoomDoc,
): room is BreakoutRoomDoc {
  return "bookingId" in room;
}

function toDomain(doc: ZoomSessionDoc): ZoomSession {
  const currentRooms = doc.breakoutRooms.filter(isCurrentRoom);
  const legacyRoomCount = doc.breakoutRooms.length - currentRooms.length;
  if (legacyRoomCount > 0) {
    // 旧形式は相談員単位でルームを共有しており、予約への紐付けを復元できない。
    // 移行スクリプトが bookings から作り直すまでの間、対象日のルームは欠落する。
    console.warn("[ZoomSession] dropped legacy breakout rooms", {
      organizationId: doc.organizationId,
      sessionDate: doc.sessionDate,
      droppedCount: legacyRoomCount,
    });
  }

  return ZoomSessionEntity.reconstruct({
    organizationId: doc.organizationId,
    sessionId: doc.sessionId,
    sessionDate: doc.sessionDate,
    zoomMeetingId: doc.zoomMeetingId,
    joinUrl: doc.joinUrl,
    breakoutRooms: currentRooms.map((r) =>
      BreakoutRoom.reconstruct({
        bookingId: r.bookingId,
        consultantId: r.consultantId,
        roomName: r.roomName,
        customerEmail: r.customerEmail,
      }),
    ),
    createdAt: doc.createdAt.toDate(),
  });
}

function toFirestore(session: ZoomSession): Record<string, unknown> {
  return {
    organizationId: session.getOrganizationId(),
    sessionId: session.getSessionId(),
    sessionDate: session.getSessionDate(),
    zoomMeetingId: session.getZoomMeetingId(),
    joinUrl: session.getJoinUrl(),
    breakoutRooms: session.getBreakoutRooms().map((r) => ({
      bookingId: r.getBookingId(),
      consultantId: r.getConsultantId(),
      roomName: r.getRoomName(),
      customerEmail: r.getCustomerEmail(),
    })),
    createdAt: session.getCreatedAt(),
  };
}

export class FirestoreZoomSessionRepository implements IZoomSessionRepository {
  async findByDate(
    organizationId: string,
    sessionDate: string,
  ): Promise<ZoomSession | null> {
    const doc = await db
      .collection(COLLECTION)
      .doc(`${organizationId}_${sessionDate}`)
      .get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as ZoomSessionDoc);
  }

  async save(session: ZoomSession): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(`${session.getOrganizationId()}_${session.getSessionDate()}`)
      .set(toFirestore(session));
  }
}
