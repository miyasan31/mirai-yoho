import type { Consultant } from "@/domain/consultant/consultant";

export interface IConsultantRepository {
  findById(consultantId: string): Promise<Consultant | null>;
  save(consultant: Consultant): Promise<void>;
}
