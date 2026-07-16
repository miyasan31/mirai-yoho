import type { SupportedDurationMinutes } from "@mirai-yoho/shared/slot-availability";
import type { PricePlan } from "@/domain/price-plan/price-plan";

export interface IPricePlanRepository {
  findById(
    organizationId: string,
    pricePlanId: string,
  ): Promise<PricePlan | null>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]>;
  findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<PricePlan[]>;
  findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    durationMinutes: SupportedDurationMinutes;
    totalJPY: number;
  }): Promise<PricePlan | null>;
  save(pricePlan: PricePlan): Promise<void>;
}
