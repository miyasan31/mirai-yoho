import { DomainError } from "@/domain/shared/domain-error";

interface BreakoutRoomProps {
  consultantId: string;
  roomName: string;
  participantEmails: string[];
}

export class BreakoutRoom {
  private constructor(
    private readonly consultantId: string,
    private readonly roomName: string,
    private readonly participantEmails: readonly string[],
  ) {}

  static create(props: BreakoutRoomProps): BreakoutRoom {
    return new BreakoutRoom(props.consultantId, props.roomName, [
      ...props.participantEmails,
    ]);
  }

  addParticipant(email: string): BreakoutRoom {
    if (this.hasParticipant(email)) {
      throw new DomainError(
        "PARTICIPANT_ALREADY_ASSIGNED",
        `Participant ${email} is already assigned to this room`,
      );
    }
    return new BreakoutRoom(this.consultantId, this.roomName, [
      ...this.participantEmails,
      email,
    ]);
  }

  removeParticipant(email: string): BreakoutRoom {
    return new BreakoutRoom(
      this.consultantId,
      this.roomName,
      this.participantEmails.filter((e) => e !== email),
    );
  }

  hasParticipant(email: string): boolean {
    return this.participantEmails.includes(email);
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getRoomName(): string {
    return this.roomName;
  }

  getParticipantEmails(): readonly string[] {
    return this.participantEmails;
  }
}
