import type { Organization } from "@/domain/organization/organization";

export interface IOrganizationRepository {
  findById(organizationId: string): Promise<Organization | null>;
  findByIds(organizationIds: string[]): Promise<Organization[]>;
  save(organization: Organization): Promise<void>;
}
