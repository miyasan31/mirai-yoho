import {
  BusinessHours,
  type BusinessHoursProps,
} from "@/domain/organization-settings/business-hours";
import {
  type ConsultantRankProps,
  createDefaultConsultantRanks,
  validateConsultantRanks,
} from "@/domain/organization-settings/consultant-rank";

export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  consultantRanks?: ConsultantRankProps[];
  defaultConsultantRankId?: string;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
    private businessHours: BusinessHours,
    private consultantRanks: ConsultantRankProps[],
    private defaultConsultantRankId: string,
  ) {}

  static create(props: OrganizationSettingsProps): OrganizationSettings {
    const ranks = props.consultantRanks ?? createDefaultConsultantRanks();
    const defaultRankId = props.defaultConsultantRankId ?? ranks[0].rankId;
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.create(props.businessHours),
      validateConsultantRanks(ranks, defaultRankId),
      defaultRankId,
    );
  }

  static reconstruct(props: OrganizationSettingsProps): OrganizationSettings {
    const ranks = props.consultantRanks ?? createDefaultConsultantRanks();
    const defaultRankId = props.defaultConsultantRankId ?? ranks[0].rankId;
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.reconstruct(props.businessHours),
      validateConsultantRanks(ranks, defaultRankId),
      defaultRankId,
    );
  }

  static createDefault(organizationId: string): OrganizationSettings {
    const ranks = createDefaultConsultantRanks();
    return new OrganizationSettings(
      organizationId,
      true,
      BusinessHours.createDefault(),
      ranks,
      ranks[0].rankId,
    );
  }

  updateConsultantSelectionEnabled(enabled: boolean): void {
    this.consultantSelectionEnabled = enabled;
  }

  updateBusinessHours(businessHours: BusinessHoursProps): void {
    this.businessHours = BusinessHours.create(businessHours);
  }

  updateConsultantRanks(
    ranks: ConsultantRankProps[],
    defaultRankId: string,
  ): void {
    this.consultantRanks = validateConsultantRanks(ranks, defaultRankId);
    this.defaultConsultantRankId = defaultRankId;
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

  getConsultantRanks(): ConsultantRankProps[] {
    return this.consultantRanks.map((rank) => ({ ...rank }));
  }

  getDefaultConsultantRankId(): string {
    return this.defaultConsultantRankId;
  }

  findConsultantRank(rankId: string): ConsultantRankProps | null {
    return this.consultantRanks.find((rank) => rank.rankId === rankId) ?? null;
  }
}
