import type { CompanyInfoProps } from "@/domain/settings/company-info";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface UpdateCompanyInfoInput {
  organizationId: string;
  companyInfo: CompanyInfoProps;
}

export class UpdateCompanyInfoUseCase {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(input: UpdateCompanyInfoInput): Promise<Settings> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    settings.updateCompanyInfo(input.companyInfo);
    await this.settingsRepository.save(settings);
    return settings;
  }
}
