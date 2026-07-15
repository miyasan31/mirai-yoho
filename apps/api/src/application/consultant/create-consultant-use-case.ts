import { AppError } from "@/application/shared/app-error";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface CreateConsultantInput {
  organizationId: string;
  consultantId: string;
  name: string;
  bio?: string;
  specialties?: string[];
  phone?: string;
  statusId?: string;
}

interface CreateConsultantOutput {
  consultantId: string;
}

export class CreateConsultantUseCase {
  constructor(
    private readonly consultantRepository: IConsultantRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(input: CreateConsultantInput): Promise<CreateConsultantOutput> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    const statusId = input.statusId ?? settings.getDefaultConsultantStatusId();
    if (!settings.findConsultantStatus(statusId)) {
      throw new AppError(400, "VALIDATION_ERROR", "statusId is invalid");
    }
    const consultant = Consultant.create({
      organizationId: input.organizationId,
      consultantId: input.consultantId,
      profile: ConsultantProfile.create(
        input.name,
        input.bio ?? "",
        input.specialties ?? [],
        input.phone ?? "",
      ),
      statusId,
    });
    await this.consultantRepository.save(consultant);
    return { consultantId: input.consultantId };
  }
}
