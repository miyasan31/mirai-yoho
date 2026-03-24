import type { Consultant } from "@/domain/consultant/consultant";

export interface IConsultantRepository {
  findById(consultantId: string): Promise<Consultant | null>;
  findAllActive(): Promise<Consultant[]>;
  save(consultant: Consultant): Promise<void>;
}
