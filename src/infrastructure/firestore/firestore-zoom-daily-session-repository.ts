import type { Timestamp } from "firebase-admin/firestore";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";
import type { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";
import { ZoomDailySession as ZoomDailySessionEntity } from "@/domain/zoom-session/zoom-daily-session";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.zoomDailySessions;

interface BreakoutRoomDoc {
  consultantId: string;
  roomName: string;
  participantEmails: string[];
}

interface ZoomDailySessionDoc {
  organizationId: string;
  sessionId: string;
  sessionDate: string;
  zoomMeetingId: string;
  joinUrl: string;
  breakoutRooms: BreakoutRoomDoc[];
  createdAt: Timestamp;
}

function toDomain(doc: ZoomDailySessionDoc): ZoomDailySession {
  return ZoomDailySessionEntity.reconstruct({
    organizationId: doc.organizationId,
    sessionId: doc.sessionId,
    sessionDate: doc.sessionDate,
    zoomMeetingId: doc.zoomMeetingId,
    joinUrl: doc.joinUrl,
    breakoutRooms: doc.breakoutRooms.map((r) =>
      BreakoutRoom.create({
        consultantId: r.consultantId,
        roomName: r.roomName,
        participantEmails: r.participantEmails,
      }),
    ),
    createdAt: doc.createdAt.toDate(),
  });
}

function toFirestore(session: ZoomDailySession): Record<string, unknown> {
  return {
    organizationId: session.getOrganizationId(),
    sessionId: session.getSessionId(),
    sessionDate: session.getSessionDate(),
    zoomMeetingId: session.getZoomMeetingId(),
    joinUrl: session.getJoinUrl(),
    breakoutRooms: session.getBreakoutRooms().map((r) => ({
      consultantId: r.getConsultantId(),
      roomName: r.getRoomName(),
      participantEmails: [...r.getParticipantEmails()],
    })),
    createdAt: session.getCreatedAt(),
  };
}

export class FirestoreZoomDailySessionRepository
  implements IZoomDailySessionRepository
{
  async findByDate(
    organizationId: string,
    sessionDate: string,
  ): Promise<ZoomDailySession | null> {
    const doc = await db
      .collection(COLLECTION)
      .doc(`${organizationId}_${sessionDate}`)
      .get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as ZoomDailySessionDoc);
  }

  async save(session: ZoomDailySession): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(`${session.getOrganizationId()}_${session.getSessionDate()}`)
      .set(toFirestore(session));
  }
}
