import type { BusinessHoursProps } from "@/domain/organization-settings/business-hours";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";

interface UpdateBookingSettingsInput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
}

interface UpdateBookingSettingsOutput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
  businessHours: BusinessHoursProps;
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

    await this.organizationSettingsRepository.save(settings);

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
      businessHours: settings.getBusinessHours().toJSON(),
    };
  }
}
