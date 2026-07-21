import type { SupportedDurationMinutes } from "@mirai-yoho/shared/slot-availability";
import { createPricePlanSelectionId } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface ListPricePlanOptionsInput {
  organizationId: string;
  consultantId: string;
}

interface PricePlanOptionOutput {
  selectionId: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
}

interface ListPricePlanOptionsOutput {
  pricePlans: PricePlanOptionOutput[];
}

export class ListPricePlanOptionsUseCase {
  constructor(
    private readonly pricePlanRepository: IPricePlanRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(
    input: ListPricePlanOptionsInput,
  ): Promise<ListPricePlanOptionsOutput> {
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    const pricePlanRange = settings.getPricePlanRange();

    const activePlans = await this.pricePlanRepository.findActiveByConsultantId(
      input.organizationId,
      input.consultantId,
    );
    const pricePlans = activePlans
      .filter((pricePlan) => pricePlanRange.contains(pricePlan.getTotalJPY()))
      .map((pricePlan) => ({
        selectionId: createPricePlanSelectionId({
          name: pricePlan.getName(),
          durationMinutes: pricePlan.getDurationMinutes(),
          totalJPY: pricePlan.getTotalJPY(),
        }),
        name: pricePlan.getName(),
        totalJPY: pricePlan.getTotalJPY(),
        durationMinutes: pricePlan.getDurationMinutes(),
      }));
    return { pricePlans };
  }
}
