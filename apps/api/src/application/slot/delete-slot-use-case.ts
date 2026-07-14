import { AppError } from "@/application/shared/app-error";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface DeleteSlotInput {
  organizationId: string;
  slotId: string;
  requesterConsultantId?: string;
}

export class DeleteSlotUseCase {
  constructor(private readonly slotRepository: ISlotRepository) {}

  async execute(input: DeleteSlotInput): Promise<void> {
    const slot = await this.slotRepository.findById(
      input.organizationId,
      input.slotId,
    );
    if (!slot) {
      throw new AppError(404, "NOT_FOUND", "Slot not found");
    }
    if (
      input.requesterConsultantId !== undefined &&
      slot.getConsultantId() !== input.requesterConsultantId
    ) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Consultants can only delete their own slots",
      );
    }
    await this.slotRepository.delete(input.organizationId, input.slotId);
  }
}
