import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

interface UpdateProfileInput {
  organizationId: string;
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
}

export class UpdateProfileUseCase {
  constructor(private readonly consultantRepository: IConsultantRepository) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    const profile = ConsultantProfile.create(
      input.displayName,
      input.bio,
      input.specialties,
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
        zoomRoomIds: [],
      });
    }

    await this.consultantRepository.save(consultant);
  }
}
