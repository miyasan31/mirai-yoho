import { AppError } from "@/application/shared/app-error";
import { parsePricePlanSelectionId } from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";

interface UpdateConsultantPricePlanInput {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
  name?: string;
  restore?: boolean;
}

export class UpdateConsultantPricePlanUseCase {
  constructor(
    private readonly consultantPricePlanRepository: IConsultantPricePlanRepository,
  ) {}

  async execute(input: UpdateConsultantPricePlanInput): Promise<void> {
    const pricePlan = await this.consultantPricePlanRepository.findById(
      input.organizationId,
      input.pricePlanId,
    );
    if (!pricePlan || pricePlan.getConsultantId() !== input.consultantId) {
      throw new AppError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
    }

    if (input.name !== undefined) {
      const currentSelection = parsePricePlanSelectionId(
        pricePlan.getSelectionId(),
      );
      const renamedSelection = parsePricePlanSelectionId(
        `signature:${encodeURIComponent(input.name.trim().replace(/\s+/g, " ").toLowerCase())}:${pricePlan.getTotalJPY()}`,
      );
      if (!currentSelection || !renamedSelection) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid plan name");
      }
      const duplicated =
        await this.consultantPricePlanRepository.findBySignature({
          organizationId: input.organizationId,
          consultantId: input.consultantId,
          normalizedName: renamedSelection.normalizedName,
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
            : "PRICE_PLAN_ALREADY_DELETED",
          duplicated.isActive()
            ? "Same plan already exists"
            : "Same deleted plan exists and can be restored",
        );
      }
      pricePlan.rename(input.name);
    }

    if (input.restore) {
      pricePlan.restore();
    }

    await this.consultantPricePlanRepository.save(pricePlan);
  }
}
