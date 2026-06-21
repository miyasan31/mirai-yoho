import {
  BusinessHours,
  type BusinessHoursProps,
} from "@/domain/organization-settings/business-hours";
import {
  type ConsultantRankProps,
  createDefaultConsultantRanks,
  validateConsultantRanks,
} from "@/domain/organization-settings/consultant-rank";
import {
  PricePlanRange,
  type PricePlanRangeProps,
} from "@/domain/organization-settings/price-plan-range";

export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  consultantRanks?: ConsultantRankProps[];
  defaultConsultantRankId?: string;
  pricePlanRange?: PricePlanRangeProps;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
    private businessHours: BusinessHours,
    private consultantRanks: ConsultantRankProps[],
    private defaultConsultantRankId: string,
    private pricePlanRange: PricePlanRange,
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
      PricePlanRange.create(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
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
      PricePlanRange.reconstruct(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
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
      PricePlanRange.createDefault(),
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

  updatePricePlanRange(pricePlanRange: PricePlanRangeProps): void {
    this.pricePlanRange = PricePlanRange.create(pricePlanRange);
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

  getPricePlanRange(): PricePlanRange {
    return PricePlanRange.reconstruct(this.pricePlanRange.toJSON());
  }
}
