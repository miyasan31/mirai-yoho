export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
  ) {}

  static create(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
    );
  }

  static reconstruct(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
    );
  }

  static createDefault(organizationId: string): OrganizationSettings {
    return new OrganizationSettings(organizationId, true);
  }

  updateConsultantSelectionEnabled(enabled: boolean): void {
    this.consultantSelectionEnabled = enabled;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getConsultantSelectionEnabled(): boolean {
    return this.consultantSelectionEnabled;
  }
}
