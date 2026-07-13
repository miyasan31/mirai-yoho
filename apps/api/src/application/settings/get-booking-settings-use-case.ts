import type { BusinessHoursProps } from "@mirai-yoho/shared/business-hours";
import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import type { PricePlanRangeProps } from "@/domain/settings/price-plan-range";
import { PricePlanRange } from "@/domain/settings/price-plan-range";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface GetBookingSettingsInput {
  organizationId: string;
}

interface GetBookingSettingsOutput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
  pricePlanRange: PricePlanRangeProps;
}

export class GetBookingSettingsUseCase {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(
    input: GetBookingSettingsInput,
  ): Promise<GetBookingSettingsOutput> {
    const { organizationId } = input;
    const settings =
      await this.settingsRepository.findByOrganizationId(organizationId);

    if (!settings) {
      return {
        organizationId,
        consultantSelectionEnabled: true,
        businessHours: BusinessHours.createDefault().toJSON(),
        pricePlanRange: PricePlanRange.createDefault().toJSON(),
      };
    }

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
      businessHours: settings.getBusinessHours().toJSON(),
      pricePlanRange: settings.getPricePlanRange().toJSON(),
    };
  }
}
