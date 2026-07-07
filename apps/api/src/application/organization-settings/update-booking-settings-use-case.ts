import type { BusinessHoursProps } from "@mirai-yoho/shared/business-hours";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import type { PricePlanRangeProps } from "@/domain/organization-settings/price-plan-range";

interface UpdateBookingSettingsInput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  pricePlanRange: PricePlanRangeProps;
}

interface UpdateBookingSettingsOutput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  pricePlanRange: PricePlanRangeProps;
}

export class UpdateBookingSettingsUseCase {
  constructor(
    private readonly organizationSettingsRepository: IOrganizationSettingsRepository,
  ) {}

  async execute(
    input: UpdateBookingSettingsInput,
  ): Promise<UpdateBookingSettingsOutput> {
    const { organizationId } = input;
    const existingSettings =
      await this.organizationSettingsRepository.findByOrganizationId(
        organizationId,
      );

    const settings =
      existingSettings ?? OrganizationSettings.createDefault(organizationId);
    settings.updateConsultantSelectionEnabled(input.consultantSelectionEnabled);
    settings.updateBusinessHours(input.businessHours);
    settings.updatePricePlanRange(input.pricePlanRange);

    await this.organizationSettingsRepository.save(settings);

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
      businessHours: settings.getBusinessHours().toJSON(),
      pricePlanRange: settings.getPricePlanRange().toJSON(),
    };
  }
}
