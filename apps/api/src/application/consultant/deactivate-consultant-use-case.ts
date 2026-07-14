import { AppError } from "@/application/shared/app-error";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

interface DeactivateConsultantInput {
  organizationId: string;
  consultantId: string;
}

export class DeactivateConsultantUseCase {
  constructor(private readonly consultantRepository: IConsultantRepository) {}

  async execute(input: DeactivateConsultantInput): Promise<void> {
    const consultant = await this.consultantRepository.findById(
      input.organizationId,
      input.consultantId,
    );
    if (!consultant) {
      throw new AppError(404, "NOT_FOUND", "Consultant not found");
    }
    consultant.deactivate();
    await this.consultantRepository.save(consultant);
  }
}
