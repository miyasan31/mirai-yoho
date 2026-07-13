import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { DEFAULT_CONSULTANT_STATUS_ID } from "@/domain/organization-settings/consultant-status";

interface UpdateProfileInput {
  organizationId: string;
  consultantId: string;
  name: string;
  bio: string;
  specialties: string[];
  phone: string;
  imageUrl?: string;
}

export class UpdateProfileUseCase {
  constructor(private readonly consultantRepository: IConsultantRepository) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    const profile = ConsultantProfile.create(
      input.name,
      input.bio,
      input.specialties,
      input.phone,
      input.imageUrl,
    );

    let consultant = await this.consultantRepository.findById(
      input.organizationId,
      input.consultantId,
    );

    if (consultant) {
      consultant.updateProfile(profile);
    } else {
      consultant = Consultant.create({
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        profile,
        statusId: DEFAULT_CONSULTANT_STATUS_ID,
      });
    }

    await this.consultantRepository.save(consultant);
  }
}
