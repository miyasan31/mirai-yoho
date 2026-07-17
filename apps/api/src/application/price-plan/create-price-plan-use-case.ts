import {
  isSupportedDuration,
  type SupportedDurationMinutes,
} from "@mirai-yoho/shared/slot-availability";
import { AppError } from "@/application/shared/app-error";
import {
  PricePlan,
  parsePricePlanSelectionId,
} from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface CreatePricePlanInput {
  organizationId: string;
  consultantId: string;
  name: string;
  totalJPY: number;
  durationMinutes: number;
}

export interface PricePlanOutput {
  pricePlanId: string;
  name: string;
  totalJPY: number;
  durationMinutes: SupportedDurationMinutes;
  selectionId: string;
  isWithinCurrentRange: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function toPricePlanOutput(params: {
  pricePlan: PricePlan;
  isWithinCurrentRange: boolean;
}): PricePlanOutput {
  return {
    pricePlanId: params.pricePlan.getPricePlanId(),
    name: params.pricePlan.getName(),
    totalJPY: params.pricePlan.getTotalJPY(),
    durationMinutes: params.pricePlan.getDurationMinutes(),
    selectionId: params.pricePlan.getSelectionId(),
    isWithinCurrentRange: params.isWithinCurrentRange,
    createdAt: params.pricePlan.getCreatedAt().toISOString(),
    updatedAt: params.pricePlan.getUpdatedAt().toISOString(),
    archivedAt: params.pricePlan.getArchivedAt()?.toISOString() ?? null,
  };
}

export class CreatePricePlanUseCase {
  constructor(
    private readonly pricePlanRepository: IPricePlanRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(input: CreatePricePlanInput): Promise<PricePlanOutput> {
    if (!isSupportedDuration(input.durationMinutes)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Plan duration must be one of 30, 60, 90, 120 minutes",
      );
    }
    const durationMinutes: SupportedDurationMinutes = input.durationMinutes;

    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);

    if (!settings.getPricePlanRange().contains(input.totalJPY)) {
      throw new AppError(
        400,
        "PRICE_PLAN_OUT_OF_RANGE",
        "Plan amount is outside the configured range",
      );
    }

    const selection = parsePricePlanSelectionId(
      PricePlan.create({
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        pricePlanId: "validation-only",
        name: input.name,
        totalJPY: input.totalJPY,
        durationMinutes,
      }).getSelectionId(),
    );
    if (!selection) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid price plan");
    }

    const duplicated = await this.pricePlanRepository.findBySignature({
      organizationId: input.organizationId,
      consultantId: input.consultantId,
      normalizedName: selection.normalizedName,
      durationMinutes: selection.durationMinutes,
      totalJPY: selection.totalJPY,
    });
    if (duplicated) {
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

    const pricePlan = PricePlan.create({
      organizationId: input.organizationId,
      consultantId: input.consultantId,
      pricePlanId: crypto.randomUUID(),
      name: input.name,
      totalJPY: input.totalJPY,
      durationMinutes,
    });

    await this.pricePlanRepository.save(pricePlan);

    return toPricePlanOutput({
      pricePlan,
      isWithinCurrentRange: true,
    });
  }
}
