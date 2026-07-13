import type { Role } from "@/domain/authorization/role";

export interface RoleRepository {
  findById(organizationId: string, roleId: string): Promise<Role | null>;
  findByOrganizationId(organizationId: string): Promise<Role[]>;
  save(role: Role): Promise<void>;
  delete(organizationId: string, roleId: string): Promise<void>;
}
