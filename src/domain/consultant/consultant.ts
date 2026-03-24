import type { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";

interface ConsultantCreateProps {
  consultantId: string;
  profile: ConsultantProfile;
  zoomRoomIds: string[];
}

interface ConsultantProps extends ConsultantCreateProps {
  isActive: boolean;
}

export class Consultant extends AggregateRoot {
  private constructor(
    private readonly consultantId: string,
    private profile: ConsultantProfile,
    private zoomRoomIds: string[],
    private isActive: boolean,
  ) {
    super();
  }

  static create(props: ConsultantCreateProps): Consultant {
    return new Consultant(
      props.consultantId,
      props.profile,
      [...props.zoomRoomIds],
      true,
    );
  }

  static reconstruct(props: ConsultantProps): Consultant {
    return new Consultant(
      props.consultantId,
      props.profile,
      [...props.zoomRoomIds],
      props.isActive,
    );
  }

  updateProfile(profile: ConsultantProfile): void {
    this.profile = profile;
  }

  assignZoomRooms(roomIds: string[]): void {
    this.zoomRoomIds = [...roomIds];
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainError(
        "ALREADY_DEACTIVATED",
        "Consultant is already deactivated",
      );
    }
    this.isActive = false;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getProfile(): ConsultantProfile {
    return this.profile;
  }

  getZoomRoomIds(): string[] {
    return [...this.zoomRoomIds];
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
