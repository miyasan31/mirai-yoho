import {
  BusinessHours,
  type BusinessHoursProps,
} from "@/domain/organization-settings/business-hours";
import {
  PricePlanRange,
  type PricePlanRangeProps,
} from "@/domain/organization-settings/price-plan-range";

export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  pricePlanRange?: PricePlanRangeProps;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
    private businessHours: BusinessHours,
    private pricePlanRange: PricePlanRange,
  ) {}

  static create(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.create(props.businessHours),
      PricePlanRange.create(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
    );
  }

  static reconstruct(props: OrganizationSettingsProps): OrganizationSettings {
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.reconstruct(props.businessHours),
      PricePlanRange.reconstruct(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
    );
  }

  static createDefault(organizationId: string): OrganizationSettings {
    return new OrganizationSettings(
      organizationId,
      true,
      BusinessHours.createDefault(),
      PricePlanRange.createDefault(),
    );
  }

  updateConsultantSelectionEnabled(enabled: boolean): void {
    this.consultantSelectionEnabled = enabled;
  }

  updateBusinessHours(businessHours: BusinessHoursProps): void {
    this.businessHours = BusinessHours.create(businessHours);
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

  getPricePlanRange(): PricePlanRange {
    return PricePlanRange.reconstruct(this.pricePlanRange.toJSON());
  }
}
