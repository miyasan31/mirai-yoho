import type { BusinessHoursProps } from "@/domain/organization-settings/business-hours";
import { BusinessHours } from "@/domain/organization-settings/business-hours";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";

interface GetBookingSettingsInput {
  organizationId: string;
}

interface GetBookingSettingsOutput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
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
      };
    }

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
      businessHours: settings.getBusinessHours().toJSON(),
    };
  }
}
