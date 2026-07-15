import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ConsultantStatusProps } from "@/domain/settings/consultant-status";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface UpdateConsultantStatusesInput {
  organizationId: string;
  statuses: ConsultantStatusProps[];
  defaultStatusId: string;
}

export class UpdateConsultantStatusesUseCase {
  constructor(
    private readonly settingsRepository: ISettingsRepository,
    private readonly consultantRepository: IConsultantRepository,
  ) {}

  async execute(input: UpdateConsultantStatusesInput): Promise<Settings> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    settings.updateConsultantStatuses(input.statuses, input.defaultStatusId);
    await this.settingsRepository.save(settings);

    const validStatusIds = new Set(
      settings.getConsultantStatuses().map((status) => status.statusId),
    );
    const consultants = await this.consultantRepository.findAll(
      input.organizationId,
    );
    await Promise.all(
      consultants
        .filter((consultant) => !validStatusIds.has(consultant.getStatusId()))
        .map((consultant) => {
          consultant.changeStatus(settings.getDefaultConsultantStatusId());
          return this.consultantRepository.save(consultant);
        }),
    );

    return settings;
  }
}
