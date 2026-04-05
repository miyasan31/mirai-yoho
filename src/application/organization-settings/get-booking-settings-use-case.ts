import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";

interface GetBookingSettingsInput {
  organizationId?: string;
}

interface GetBookingSettingsOutput {
  organizationId: string;
  consultantSelectionEnabled: boolean;
}

export class GetBookingSettingsUseCase {
  constructor(
    private readonly organizationSettingsRepository: IOrganizationSettingsRepository,
  ) {}

  async execute(
    input: GetBookingSettingsInput = {},
  ): Promise<GetBookingSettingsOutput> {
    const organizationId = input.organizationId ?? "default";
    const settings =
      await this.organizationSettingsRepository.findByOrganizationId(
        organizationId,
      );

    if (!settings) {
      return {
        organizationId,
        consultantSelectionEnabled: true,
      };
    }

    return {
      organizationId: settings.getOrganizationId(),
      consultantSelectionEnabled: settings.getConsultantSelectionEnabled(),
    };
  }
}
