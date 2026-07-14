import type { Timestamp } from "firebase-admin/firestore";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";
import type { ZoomSession } from "@/domain/zoom-session/zoom-session";
import { ZoomSession as ZoomSessionEntity } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";
import { db } from "@/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.zoomSessions;

interface BreakoutRoomDoc {
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
  breakoutRooms: BreakoutRoomDoc[];
  createdAt: Timestamp;
}

function toDomain(doc: ZoomSessionDoc): ZoomSession {
  return ZoomSessionEntity.reconstruct({
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

function toFirestore(session: ZoomSession): Record<string, unknown> {
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
