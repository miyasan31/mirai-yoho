import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

interface UpdateProfileInput {
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
}

export class UpdateProfileUseCase {
  constructor(private readonly consultantRepository: IConsultantRepository) {}

  async execute(input: UpdateProfileInput): Promise<void> {
    const consultant = await this.consultantRepository.findById(
      input.consultantId,
    );
    if (!consultant) {
      throw new Error("Consultant not found");
    }

    consultant.updateProfile(
      ConsultantProfile.create(input.displayName, input.bio, input.specialties),
    );
    await this.consultantRepository.save(consultant);
  }
}
