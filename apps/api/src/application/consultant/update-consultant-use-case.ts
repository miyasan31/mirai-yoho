import { AppError } from "@/application/shared/app-error";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface UpdateConsultantInput {
  organizationId: string;
  consultantId: string;
  name?: string;
  bio?: string;
  specialties?: string[];
  phone?: string;
  statusId?: string;
}

export class UpdateConsultantUseCase {
  constructor(
    private readonly consultantRepository: IConsultantRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(input: UpdateConsultantInput): Promise<void> {
    const consultant = await this.consultantRepository.findById(
      input.organizationId,
      input.consultantId,
    );
    if (!consultant) {
      throw new AppError(404, "NOT_FOUND", "Consultant not found");
    }

    if (input.name) {
      const currentProfile = consultant.getProfile();
      consultant.updateProfile(
        ConsultantProfile.create(
          input.name,
          input.bio ?? currentProfile.getBio(),
          input.specialties ?? [...currentProfile.getSpecialties()],
          input.phone ?? currentProfile.getPhone(),
          currentProfile.getImageUrl(),
        ),
      );
    }

    if (input.statusId !== undefined) {
      const settings =
        (await this.settingsRepository.findByOrganizationId(
          input.organizationId,
        )) ?? Settings.createDefault(input.organizationId);
      if (!settings.findConsultantStatus(input.statusId)) {
        throw new AppError(400, "VALIDATION_ERROR", "statusId is invalid");
      }
      consultant.changeStatus(input.statusId);
    }

    await this.consultantRepository.save(consultant);
  }
}
