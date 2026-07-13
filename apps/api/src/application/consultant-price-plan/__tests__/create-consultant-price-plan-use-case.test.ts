import { CreateConsultantPricePlanUseCase } from "@/application/consultant-price-plan/create-consultant-price-plan-use-case";
import { ConsultantPricePlan } from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

const ORGANIZATION_ID = "org-1";
const CONSULTANT_ID = "consultant-1";

class InMemoryConsultantPricePlanRepository
  implements IConsultantPricePlanRepository
{
  constructor(public readonly pricePlans: ConsultantPricePlan[] = []) {}

  async findById(
    _organizationId: string,
    pricePlanId: string,
  ): Promise<ConsultantPricePlan | null> {
    return (
      this.pricePlans.find(
        (pricePlan) => pricePlan.getPricePlanId() === pricePlanId,
      ) ?? null
    );
  }

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    return this.pricePlans.filter(
      (pricePlan) => pricePlan.getConsultantId() === consultantId,
    );
  }

  async findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    return (await this.findByConsultantId(organizationId, consultantId)).filter(
      (pricePlan) => pricePlan.isActive(),
    );
  }

  async findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<ConsultantPricePlan | null> {
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

  async save(pricePlan: ConsultantPricePlan): Promise<void> {
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

function createUseCase(pricePlans: ConsultantPricePlan[] = []): {
  useCase: CreateConsultantPricePlanUseCase;
  repository: InMemoryConsultantPricePlanRepository;
} {
  const repository = new InMemoryConsultantPricePlanRepository(pricePlans);
  return {
    useCase: new CreateConsultantPricePlanUseCase(
      repository,
      new InMemorySettingsRepository(),
    ),
    repository,
  };
}

function createExistingPlan() {
  return ConsultantPricePlan.create({
    organizationId: ORGANIZATION_ID,
    consultantId: CONSULTANT_ID,
    pricePlanId: "plan-1",
    name: "通常鑑定",
    totalJPY: 5000,
  });
}

describe("CreateConsultantPricePlanUseCase", () => {
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

  it("returns a restoreable duplicate error when the same deleted plan exists", async () => {
    const deletedPlan = createExistingPlan();
    deletedPlan.delete();
    const { useCase } = createUseCase([deletedPlan]);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        consultantId: CONSULTANT_ID,
        name: "通常鑑定",
        totalJPY: 5000,
      }),
    ).rejects.toMatchObject({
      code: "PRICE_PLAN_ALREADY_DELETED",
      statusCode: 409,
    });
  });
});
