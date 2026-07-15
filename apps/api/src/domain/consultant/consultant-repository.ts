import type { Consultant } from "@/domain/consultant/consultant";

export interface IConsultantRepository {
  findById(
    organizationId: string,
    consultantId: string,
  ): Promise<Consultant | null>;
  findAll(organizationId: string): Promise<Consultant[]>;
  findAllActive(organizationId: string): Promise<Consultant[]>;
  findOrganizationIdsByConsultantId(consultantId: string): Promise<string[]>;
  findByConsultantId(consultantId: string): Promise<Consultant[]>;
  save(consultant: Consultant): Promise<void>;
  delete(organizationId: string, consultantId: string): Promise<void>;
}
