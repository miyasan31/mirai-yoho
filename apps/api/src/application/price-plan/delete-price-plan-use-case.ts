import { AppError } from "@/application/shared/app-error";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";

interface DeletePricePlanInput {
  organizationId: string;
  consultantId: string;
  pricePlanId: string;
}

export class DeletePricePlanUseCase {
  constructor(private readonly pricePlanRepository: IPricePlanRepository) {}

  async execute(input: DeletePricePlanInput): Promise<void> {
    const pricePlan = await this.pricePlanRepository.findById(
      input.organizationId,
      input.pricePlanId,
    );
    if (!pricePlan || pricePlan.getConsultantId() !== input.consultantId) {
      throw new AppError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
    }
    pricePlan.delete();
    await this.pricePlanRepository.save(pricePlan);
  }
}
