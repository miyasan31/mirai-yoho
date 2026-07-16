import { AppError } from "@/application/shared/app-error";
import { parsePricePlanSelectionId } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";

interface UpdatePricePlanInput {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name?: string;
  unarchive?: boolean;
}

export class UpdatePricePlanUseCase {
  constructor(private readonly pricePlanRepository: IPricePlanRepository) {}

  async execute(input: UpdatePricePlanInput): Promise<void> {
    const pricePlan = await this.pricePlanRepository.findById(
      input.organizationId,
      input.pricePlanId,
    );
    if (!pricePlan || pricePlan.getConsultantId() !== input.consultantId) {
      throw new AppError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
    }

    if (input.name !== undefined) {
      const durationMinutes = pricePlan.getDurationMinutes();
      const renamedSelection = parsePricePlanSelectionId(
        `signature:${encodeURIComponent(input.name.trim().replace(/\s+/g, " ").toLowerCase())}:${durationMinutes}:${pricePlan.getTotalJPY()}`,
      );
      if (!renamedSelection) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid plan name");
      }
      const duplicated = await this.pricePlanRepository.findBySignature({
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        normalizedName: renamedSelection.normalizedName,
        durationMinutes: renamedSelection.durationMinutes,
        totalJPY: renamedSelection.totalJPY,
      });
      if (
        duplicated &&
        duplicated.getPricePlanId() !== pricePlan.getPricePlanId()
      ) {
        throw new AppError(
          409,
          duplicated.isActive()
            ? "PRICE_PLAN_ALREADY_EXISTS"
            : "PRICE_PLAN_ALREADY_ARCHIVED",
          duplicated.isActive()
            ? "Same plan already exists"
            : "Same archived plan exists and can be unarchived",
        );
      }
      pricePlan.rename(input.name);
    }

    if (input.unarchive) {
      pricePlan.unarchive();
    }

    await this.pricePlanRepository.save(pricePlan);
  }
}
