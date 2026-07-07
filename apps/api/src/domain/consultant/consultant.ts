import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

interface ConsultantCreateProps {
  organizationId: string;
  consultantId: string;
  profile: ConsultantProfile;
  zoomRoomIds: string[];
  statusId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConsultantProps extends ConsultantCreateProps {
  isActive: boolean;
}

export class Consultant extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly consultantId: string,
    private profile: ConsultantProfile,
    private zoomRoomIds: string[],
    private statusId: string,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: ConsultantCreateProps): Consultant {
    const now = new Date();
    return new Consultant(
      props.organizationId,
      props.consultantId,
      props.profile,
      [...props.zoomRoomIds],
      props.statusId,
      true,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: ConsultantProps): Consultant {
    const createdAt = props.createdAt ?? new Date(0);
    return new Consultant(
      props.organizationId,
      props.consultantId,
      props.profile,
      [...props.zoomRoomIds],
      props.statusId,
      props.isActive,
      createdAt,
      props.updatedAt ?? createdAt,
    );
  }

  updateProfile(profile: ConsultantProfile): void {
    this.profile = profile;
    this.updatedAt = new Date();
  }

  assignZoomRooms(roomIds: string[]): void {
    this.zoomRoomIds = [...roomIds];
    this.updatedAt = new Date();
  }

  changeStatus(statusId: string): void {
    this.statusId = statusId;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainError(
        "ALREADY_DEACTIVATED",
        "Consultant is already deactivated",
      );
    }
    this.isActive = false;
    this.updatedAt = new Date();
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getProfile(): ConsultantProfile {
    return this.profile;
  }

  getZoomRoomIds(): string[] {
    return [...this.zoomRoomIds];
  }

  getStatusId(): string {
    return this.statusId;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
