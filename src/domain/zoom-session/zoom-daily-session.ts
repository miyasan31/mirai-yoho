import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";

interface ZoomDailySessionCreateProps {
  sessionId: string;
  sessionDate: string;
}

interface ZoomDailySessionProps {
  sessionId: string;
  sessionDate: string;
  zoomMeetingId: string;
  joinUrl: string;
  breakoutRooms: BreakoutRoom[];
  createdAt: Date;
}

export class ZoomDailySession extends AggregateRoot {
  private constructor(
    private readonly sessionId: string,
    private readonly sessionDate: string,
    private zoomMeetingId: string,
    private joinUrl: string,
    private breakoutRooms: BreakoutRoom[],
    private readonly createdAt: Date,
  ) {
    super();
  }

  static create(props: ZoomDailySessionCreateProps): ZoomDailySession {
    return new ZoomDailySession(
      props.sessionId,
      props.sessionDate,
      "",
      "",
      [],
      new Date(),
    );
  }

  static reconstruct(props: ZoomDailySessionProps): ZoomDailySession {
    return new ZoomDailySession(
      props.sessionId,
      props.sessionDate,
      props.zoomMeetingId,
      props.joinUrl,
      props.breakoutRooms,
      props.createdAt,
    );
  }

  setMeetingDetails(zoomMeetingId: string, joinUrl: string): void {
    if (this.zoomMeetingId) {
      throw new DomainError(
        "MEETING_ALREADY_SET",
        "Zoom meeting details have already been set",
      );
    }
    this.zoomMeetingId = zoomMeetingId;
    this.joinUrl = joinUrl;
  }

  assignParticipant(
    consultantId: string,
    consultantName: string,
    clientEmail: string,
  ): void {
    const existingRoom = this.breakoutRooms.find(
      (r) => r.getConsultantId() === consultantId,
    );

    if (existingRoom) {
      const updatedRoom = existingRoom.addParticipant(clientEmail);
      this.breakoutRooms = this.breakoutRooms.map((r) =>
        r.getConsultantId() === consultantId ? updatedRoom : r,
      );
    } else {
      const newRoom = BreakoutRoom.create({
        consultantId,
        roomName: consultantName,
        participantEmails: [clientEmail],
      });
      this.breakoutRooms = [...this.breakoutRooms, newRoom];
    }
  }

  removeParticipant(clientEmail: string): void {
    this.breakoutRooms = this.breakoutRooms.map((room) =>
      room.hasParticipant(clientEmail)
        ? room.removeParticipant(clientEmail)
        : room,
    );
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getSessionDate(): string {
    return this.sessionDate;
  }

  getZoomMeetingId(): string {
    return this.zoomMeetingId;
  }

  getJoinUrl(): string {
    return this.joinUrl;
  }

  getBreakoutRooms(): readonly BreakoutRoom[] {
    return this.breakoutRooms;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
