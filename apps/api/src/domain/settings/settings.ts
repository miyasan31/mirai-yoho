import {
  BusinessHours,
  type BusinessHoursProps,
} from "@mirai-yoho/shared/business-hours";
import {
  CompanyInfo,
  type CompanyInfoProps,
} from "@/domain/settings/company-info";
import {
  type ConsultantStatusInput,
  type ConsultantStatusProps,
  createDefaultConsultantStatuses,
  validateConsultantStatuses,
} from "@/domain/settings/consultant-status";
import {
  PricePlanRange,
  type PricePlanRangeProps,
} from "@/domain/settings/price-plan-range";

export interface SettingsProps {
  organizationId: string;
  businessHours: BusinessHoursProps;
  consultantStatuses?: ConsultantStatusInput[];
  defaultConsultantStatusId?: string;
  pricePlanRange?: PricePlanRangeProps;
  companyInfo?: CompanyInfoProps;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Settings {
  private constructor(
    private readonly organizationId: string,
    private businessHours: BusinessHours,
    private consultantStatuses: ConsultantStatusProps[],
    private defaultConsultantStatusId: string,
    private pricePlanRange: PricePlanRange,
    private companyInfo: CompanyInfo,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: SettingsProps): Settings {
    const statuses =
      props.consultantStatuses ?? createDefaultConsultantStatuses();
    const defaultStatusId =
      props.defaultConsultantStatusId ?? statuses[0].statusId;
    const now = new Date();
    return new Settings(
      props.organizationId,
      BusinessHours.create(props.businessHours),
      validateConsultantStatuses(statuses, defaultStatusId),
      defaultStatusId,
      PricePlanRange.create(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
      CompanyInfo.create(
        props.companyInfo ?? CompanyInfo.createDefault().toJSON(),
      ),
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: SettingsProps): Settings {
    const statuses =
      props.consultantStatuses ?? createDefaultConsultantStatuses();
    const defaultStatusId =
      props.defaultConsultantStatusId ?? statuses[0].statusId;
    return new Settings(
      props.organizationId,
      BusinessHours.reconstruct(props.businessHours),
      validateConsultantStatuses(statuses, defaultStatusId),
      defaultStatusId,
      PricePlanRange.reconstruct(
        props.pricePlanRange ?? PricePlanRange.createDefault().toJSON(),
      ),
      CompanyInfo.reconstruct(
        props.companyInfo ?? CompanyInfo.createDefault().toJSON(),
      ),
      // 監査フィールド導入前のドキュメントには存在しないため、epoch を既定にする
      props.createdAt ?? new Date(0),
      props.updatedAt ?? props.createdAt ?? new Date(0),
    );
  }

  static createDefault(organizationId: string): Settings {
    const statuses = createDefaultConsultantStatuses();
    const now = new Date();
    return new Settings(
      organizationId,
      BusinessHours.createDefault(),
      statuses,
      statuses[0].statusId,
      PricePlanRange.createDefault(),
      CompanyInfo.createDefault(),
      now,
      now,
    );
  }

  updateBusinessHours(businessHours: BusinessHoursProps): void {
    this.businessHours = BusinessHours.create(businessHours);
    this.updatedAt = new Date();
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
    this.updatedAt = new Date();
  }

  updatePricePlanRange(pricePlanRange: PricePlanRangeProps): void {
    this.pricePlanRange = PricePlanRange.create(pricePlanRange);
    this.updatedAt = new Date();
  }

  updateCompanyInfo(companyInfo: CompanyInfoProps): void {
    this.companyInfo = CompanyInfo.create(companyInfo);
    this.updatedAt = new Date();
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
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

  getCompanyInfo(): CompanyInfo {
    return CompanyInfo.reconstruct(this.companyInfo.toJSON());
  }
}
