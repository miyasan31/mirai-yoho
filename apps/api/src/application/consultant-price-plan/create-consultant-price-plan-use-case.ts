import { AppError } from "@/application/shared/app-error";
import {
  ConsultantPricePlan,
  parsePricePlanSelectionId,
} from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

interface CreateConsultantPricePlanInput {
  organizationId: string;
  consultantId: string;
  name: string;
  totalJPY: number;
}

export interface ConsultantPricePlanOutput {
  pricePlanId: string;
  name: string;
  totalJPY: number;
  status: "active" | "deleted";
  selectionId: string;
  isWithinCurrentRange: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toConsultantPricePlanOutput(params: {
  pricePlan: ConsultantPricePlan;
  isWithinCurrentRange: boolean;
}): ConsultantPricePlanOutput {
  return {
    pricePlanId: params.pricePlan.getPricePlanId(),
    name: params.pricePlan.getName(),
    totalJPY: params.pricePlan.getTotalJPY(),
    status: params.pricePlan.getStatus(),
    selectionId: params.pricePlan.getSelectionId(),
    isWithinCurrentRange: params.isWithinCurrentRange,
    createdAt: params.pricePlan.getCreatedAt().toISOString(),
    updatedAt: params.pricePlan.getUpdatedAt().toISOString(),
    deletedAt: params.pricePlan.getDeletedAt()?.toISOString() ?? null,
  };
}

export class CreateConsultantPricePlanUseCase {
  constructor(
    private readonly consultantPricePlanRepository: IConsultantPricePlanRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(
    input: CreateConsultantPricePlanInput,
  ): Promise<ConsultantPricePlanOutput> {
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
      ConsultantPricePlan.create({
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        pricePlanId: "validation-only",
        name: input.name,
        totalJPY: input.totalJPY,
      }).getSelectionId(),
    );
    if (!selection) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid price plan");
    }

    const duplicated = await this.consultantPricePlanRepository.findBySignature(
      {
        organizationId: input.organizationId,
        consultantId: input.consultantId,
        normalizedName: selection.normalizedName,
        totalJPY: selection.totalJPY,
      },
    );
    if (duplicated) {
      throw new AppError(
        duplicated.isActive() ? 409 : 409,
        duplicated.isActive()
          ? "PRICE_PLAN_ALREADY_EXISTS"
          : "PRICE_PLAN_ALREADY_DELETED",
        duplicated.isActive()
          ? "Same plan already exists"
          : "Same deleted plan exists and can be restored",
      );
    }

    const pricePlan = ConsultantPricePlan.create({
      organizationId: input.organizationId,
      consultantId: input.consultantId,
      pricePlanId: crypto.randomUUID(),
      name: input.name,
      totalJPY: input.totalJPY,
    });

    await this.consultantPricePlanRepository.save(pricePlan);

    return toConsultantPricePlanOutput({
      pricePlan,
      isWithinCurrentRange: true,
    });
  }
}
