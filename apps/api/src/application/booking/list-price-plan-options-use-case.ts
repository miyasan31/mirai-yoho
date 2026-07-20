import type { SupportedDurationMinutes } from "@mirai-yoho/shared/slot-availability";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { createPricePlanSelectionId } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface ListPricePlanOptionsInput {
  organizationId: string;
  consultantId?: string | null;
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
    private readonly consultantRepository: IConsultantRepository,
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

    if (input.consultantId) {
      const activePlans =
        await this.pricePlanRepository.findActiveByConsultantId(
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

    const consultants = await this.consultantRepository.findAllActive(
      input.organizationId,
    );
    const plansByConsultant = await Promise.all(
      consultants.map((consultant) =>
        this.pricePlanRepository.findActiveByConsultantId(
          input.organizationId,
          consultant.getConsultantId(),
        ),
      ),
    );

    const uniquePlans = new Map<string, PricePlanOptionOutput>();
    for (const plans of plansByConsultant) {
      for (const pricePlan of plans) {
        if (!pricePlanRange.contains(pricePlan.getTotalJPY())) continue;
        const selectionId = createPricePlanSelectionId({
          name: pricePlan.getName(),
          durationMinutes: pricePlan.getDurationMinutes(),
          totalJPY: pricePlan.getTotalJPY(),
        });
        if (uniquePlans.has(selectionId)) continue;
        uniquePlans.set(selectionId, {
          selectionId,
          name: pricePlan.getName(),
          totalJPY: pricePlan.getTotalJPY(),
          durationMinutes: pricePlan.getDurationMinutes(),
        });
      }
    }

    return { pricePlans: [...uniquePlans.values()] };
  }
}
