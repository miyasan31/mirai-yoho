import type { ConsultantPricePlan } from "@/domain/consultant-price-plan/consultant-price-plan";

export interface IConsultantPricePlanRepository {
  findById(
    organizationId: string,
    pricePlanId: string,
  ): Promise<ConsultantPricePlan | null>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]>;
  findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]>;
  findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<ConsultantPricePlan | null>;
  save(pricePlan: ConsultantPricePlan): Promise<void>;
}
