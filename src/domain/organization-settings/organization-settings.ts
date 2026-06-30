import {
  BusinessHours,
  type BusinessHoursProps,
} from "@/domain/organization-settings/business-hours";
import {
  type ConsultantStatusProps,
  createDefaultConsultantStatuses,
  validateConsultantStatuses,
} from "@/domain/organization-settings/consultant-status";
import {
  PricePlanRange,
  type PricePlanRangeProps,
} from "@/domain/organization-settings/price-plan-range";

export interface OrganizationSettingsProps {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  consultantStatuses?: ConsultantStatusProps[];
  defaultConsultantStatusId?: string;
  pricePlanRange?: PricePlanRangeProps;
}

export class OrganizationSettings {
  private constructor(
    private readonly organizationId: string,
    private consultantSelectionEnabled: boolean,
    private businessHours: BusinessHours,
    private consultantStatuses: ConsultantStatusProps[],
    private defaultConsultantStatusId: string,
    private pricePlanRange: PricePlanRange,
  ) {}

  static create(props: OrganizationSettingsProps): OrganizationSettings {
    const statuses =
      props.consultantStatuses ?? createDefaultConsultantStatuses();
    const defaultStatusId =
      props.defaultConsultantStatusId ?? statuses[0].statusId;
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.create(props.businessHours),
      validateConsultantStatuses(statuses, defaultStatusId),
      defaultStatusId,
      PricePlanRange.create(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
    );
  }

  static reconstruct(props: OrganizationSettingsProps): OrganizationSettings {
    const statuses =
      props.consultantStatuses ?? createDefaultConsultantStatuses();
    const defaultStatusId =
      props.defaultConsultantStatusId ?? statuses[0].statusId;
    return new OrganizationSettings(
      props.organizationId,
      props.consultantSelectionEnabled,
      BusinessHours.reconstruct(props.businessHours),
      validateConsultantStatuses(statuses, defaultStatusId),
      defaultStatusId,
      PricePlanRange.reconstruct(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
    );
  }

  static createDefault(organizationId: string): OrganizationSettings {
    const statuses = createDefaultConsultantStatuses();
    return new OrganizationSettings(
      organizationId,
      true,
      BusinessHours.createDefault(),
      statuses,
      statuses[0].statusId,
      PricePlanRange.createDefault(),
    );
  }

  updateConsultantSelectionEnabled(enabled: boolean): void {
    this.consultantSelectionEnabled = enabled;
  }

  updateBusinessHours(businessHours: BusinessHoursProps): void {
    this.businessHours = BusinessHours.create(businessHours);
  }

  updateConsultantStatuses(
    statuses: ConsultantStatusProps[],
    defaultStatusId: string,
  ): void {
    this.consultantStatuses = validateConsultantStatuses(
      statuses,
      defaultStatusId,
    );
    this.defaultConsultantStatusId = defaultStatusId;
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

  getConsultantStatuses(): ConsultantStatusProps[] {
    return this.consultantStatuses.map((status) => ({ ...status }));
  }

  getDefaultConsultantStatusId(): string {
    return this.defaultConsultantStatusId;
  }

  findConsultantStatus(statusId: string): ConsultantStatusProps | null {
    return (
      this.consultantStatuses.find((status) => status.statusId === statusId) ??
      null
    );
  }

  getPricePlanRange(): PricePlanRange {
    return PricePlanRange.reconstruct(this.pricePlanRange.toJSON());
  }
}
