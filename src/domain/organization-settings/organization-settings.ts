import {
  BusinessHours,
  type BusinessHoursProps,
} from "@/domain/organization-settings/business-hours";

export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
    private businessHours: BusinessHours,
  ) {}

  static create(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.create(props.businessHours),
    );
  }

  static reconstruct(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.reconstruct(props.businessHours),
    );
  }

  static createDefault(organizationId: string): OrganizationSettings {
    return new OrganizationSettings(
      organizationId,
      true,
      BusinessHours.createDefault(),
    );
  }

  updateConsultantSelectionEnabled(enabled: boolean): void {
    this.consultantSelectionEnabled = enabled;
  }

  updateBusinessHours(businessHours: BusinessHoursProps): void {
    this.businessHours = BusinessHours.create(businessHours);
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getConsultantSelectionEnabled(): boolean {
    return this.consultantSelectionEnabled;
  }

  getBusinessHours(): BusinessHours {
    return BusinessHours.reconstruct(this.businessHours.toJSON());
  }
}
