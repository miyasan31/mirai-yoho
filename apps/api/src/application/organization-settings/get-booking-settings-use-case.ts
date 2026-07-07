import type { BusinessHoursProps } from "@mirai-yoho/shared/business-hours";
import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import type { PricePlanRangeProps } from "@/domain/organization-settings/price-plan-range";
import { PricePlanRange } from "@/domain/organization-settings/price-plan-range";

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
  constructor(
    private readonly organizationSettingsRepository: IOrganizationSettingsRepository,
  ) {}

  async execute(
    input: GetBookingSettingsInput,
  ): Promise<GetBookingSettingsOutput> {
    const { organizationId } = input;
    const settings =
      await this.organizationSettingsRepository.findByOrganizationId(
        organizationId,
      );

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
