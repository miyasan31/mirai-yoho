import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";

interface ZoomSessionCreateProps {
  organizationId: string;
  sessionId: string;
  sessionDate: string;
}

interface ZoomSessionProps {
  organizationId: string;
  sessionId: string;
  sessionDate: string;
  zoomMeetingId: string;
  joinUrl: string;
  breakoutRooms: BreakoutRoom[];
  createdAt: Date;
}

export class ZoomSession extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly sessionId: string,
    private readonly sessionDate: string,
    private zoomMeetingId: string,
    private joinUrl: string,
    private breakoutRooms: BreakoutRoom[],
    private readonly createdAt: Date,
  ) {
    super();
  }

  static create(props: ZoomSessionCreateProps): ZoomSession {
    return new ZoomSession(
      props.organizationId,
      props.sessionId,
      props.sessionDate,
      "",
      "",
      [],
      new Date(),
    );
  }

  static reconstruct(props: ZoomSessionProps): ZoomSession {
    return new ZoomSession(
      props.organizationId,
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
    customerEmail: string,
  ): void {
    const existingRoom = this.breakoutRooms.find(
      (r) => r.getConsultantId() === consultantId,
    );

    if (existingRoom) {
      const updatedRoom = existingRoom.addParticipant(customerEmail);
      this.breakoutRooms = this.breakoutRooms.map((r) =>
        r.getConsultantId() === consultantId ? updatedRoom : r,
      );
    } else {
      const newRoom = BreakoutRoom.create({
        consultantId,
        roomName: consultantName,
        participantEmails: [customerEmail],
      });
      this.breakoutRooms = [...this.breakoutRooms, newRoom];
    }
  }

  removeParticipant(customerEmail: string): void {
    this.breakoutRooms = this.breakoutRooms.map((room) =>
      room.hasParticipant(customerEmail)
        ? room.removeParticipant(customerEmail)
        : room,
    );
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getOrganizationId(): string {
    return this.organizationId;
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
