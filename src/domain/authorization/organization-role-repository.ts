import type { OrganizationRole } from "@/domain/authorization/organization-role";

export interface OrganizationRoleRepository {
  findById(
    organizationId: string,
    roleId: string,
  ): Promise<OrganizationRole | null>;
  findByOrganizationId(organizationId: string): Promise<OrganizationRole[]>;
  save(role: OrganizationRole): Promise<void>;
  delete(organizationId: string, roleId: string): Promise<void>;
}
