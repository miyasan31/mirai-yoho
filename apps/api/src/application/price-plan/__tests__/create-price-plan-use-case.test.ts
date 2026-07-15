import { CreatePricePlanUseCase } from "@/application/price-plan/create-price-plan-use-case";
import { PricePlan } from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

const ORGANIZATION_ID = "org-1";
const CONSULTANT_ID = "consultant-1";

class InMemoryPricePlanRepository implements IPricePlanRepository {
  constructor(public readonly pricePlans: PricePlan[] = []) {}

  async findById(
    _organizationId: string,
    pricePlanId: string,
  ): Promise<PricePlan | null> {
    return (
      this.pricePlans.find(
        (pricePlan) => pricePlan.getPricePlanId() === pricePlanId,
      ) ?? null
    );
  }

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]> {
    return this.pricePlans.filter(
      (pricePlan) => pricePlan.getConsultantId() === consultantId,
    );
  }

  async findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]> {
    return (await this.findByConsultantId(organizationId, consultantId)).filter(
      (pricePlan) => pricePlan.isActive(),
    );
  }

  async findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<PricePlan | null> {
    return (
      this.pricePlans.find(
        (pricePlan) =>
          pricePlan.getOrganizationId() === params.organizationId &&
          pricePlan.getConsultantId() === params.consultantId &&
          pricePlan.getNormalizedName() === params.normalizedName &&
          pricePlan.getTotalJPY() === params.totalJPY,
      ) ?? null
    );
  }

  async save(pricePlan: PricePlan): Promise<void> {
    this.pricePlans.push(pricePlan);
  }
}

class InMemorySettingsRepository implements ISettingsRepository {
  async findByOrganizationId(organizationId: string): Promise<Settings | null> {
    const settings = Settings.createDefault(organizationId);
    settings.updatePricePlanRange({ minTotalJPY: 1000, maxTotalJPY: 100000 });
    return settings;
  }

  async save(_settings: Settings): Promise<void> {}
}

function createUseCase(pricePlans: PricePlan[] = []): {
  useCase: CreatePricePlanUseCase;
  repository: InMemoryPricePlanRepository;
} {
  const repository = new InMemoryPricePlanRepository(pricePlans);
  return {
    useCase: new CreatePricePlanUseCase(
      repository,
      new InMemorySettingsRepository(),
    ),
    repository,
  };
}

function createExistingPlan() {
  return PricePlan.create({
    organizationId: ORGANIZATION_ID,
    consultantId: CONSULTANT_ID,
    pricePlanId: "plan-1",
    name: "通常鑑定",
    totalJPY: 5000,
  });
}

describe("CreatePricePlanUseCase", () => {
  it("rejects amounts outside the configured range", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        consultantId: CONSULTANT_ID,
        name: "無料相談",
        totalJPY: 0,
      }),
    ).rejects.toMatchObject({
      code: "PRICE_PLAN_OUT_OF_RANGE",
      statusCode: 400,
    });
  });

  it("returns an unarchivable duplicate error when the same archived plan exists", async () => {
    const archivedPlan = createExistingPlan();
    archivedPlan.archive();
    const { useCase } = createUseCase([archivedPlan]);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        consultantId: CONSULTANT_ID,
        name: "通常鑑定",
        totalJPY: 5000,
      }),
    ).rejects.toMatchObject({
      code: "PRICE_PLAN_ALREADY_ARCHIVED",
      statusCode: 409,
    });
  });
});
