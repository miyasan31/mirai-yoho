import type { BusinessHoursProps } from "@mirai-yoho/shared/business-hours";
import type { PricePlanRangeProps } from "@/domain/settings/price-plan-range";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

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
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(
    input: UpdateBookingSettingsInput,
  ): Promise<UpdateBookingSettingsOutput> {
    const { organizationId } = input;
    const existingSettings =
      await this.settingsRepository.findByOrganizationId(organizationId);

    const settings = existingSettings ?? Settings.createDefault(organizationId);
    settings.updateConsultantSelectionEnabled(input.consultantSelectionEnabled);
    settings.updateBusinessHours(input.businessHours);
    settings.updatePricePlanRange(input.pricePlanRange);

    await this.settingsRepository.save(settings);

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
      businessHours: settings.getBusinessHours().toJSON(),
      pricePlanRange: settings.getPricePlanRange().toJSON(),
    };
  }
}
