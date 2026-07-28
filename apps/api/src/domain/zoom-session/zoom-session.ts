import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { BreakoutRoom } from "@/domain/zoom-session/breakout-room";

/**
 * 1 ミーティングあたりのブレイクアウトルーム上限。
 * Zoom 標準プランの上限が 50 ルーム / 200 人（`Breakout Rooms 100` 有効時は 100 ルーム / 1,000 人）。
 * 1 日 1 ミーティングにその日の全予約をルームとして載せるため、日次の予約数がこの上限になる。
 */
export const MAX_BREAKOUT_ROOMS_PER_SESSION = 50;

interface AssignBookingProps {
  bookingId: string;
  consultantId: string;
  consultantName: string;
  startsAt: Date;
  endsAt: Date;
  customerEmail: string;
}

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

  static sessionDateFromInstant(instant: Date): string {
    return instant
      .toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
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

  assignBooking(props: AssignBookingProps): void {
    if (this.breakoutRooms.some((r) => r.getBookingId() === props.bookingId)) {
      throw new DomainError(
        "BOOKING_ALREADY_ASSIGNED",
        `Booking ${props.bookingId} is already assigned to a breakout room`,
      );
    }
    if (this.breakoutRooms.length >= MAX_BREAKOUT_ROOMS_PER_SESSION) {
      throw new DomainError(
        "BREAKOUT_ROOM_LIMIT_EXCEEDED",
        `A Zoom meeting can hold at most ${MAX_BREAKOUT_ROOMS_PER_SESSION} breakout rooms`,
      );
    }

    const newRoom = BreakoutRoom.create({
      bookingId: props.bookingId,
      consultantId: props.consultantId,
      roomName: BreakoutRoom.composeRoomName({
        consultantName: props.consultantName,
        startsAt: props.startsAt,
        endsAt: props.endsAt,
      }),
      customerEmail: props.customerEmail,
    });
    this.breakoutRooms = [...this.breakoutRooms, newRoom];
  }

  removeBooking(bookingId: string): void {
    this.breakoutRooms = this.breakoutRooms.filter(
      (room) => room.getBookingId() !== bookingId,
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
