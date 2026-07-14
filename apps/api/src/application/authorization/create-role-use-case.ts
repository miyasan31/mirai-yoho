import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { AppError } from "@/application/shared/app-error";
import { isSystemRoleId, Role } from "@/domain/authorization/role";
import type { RoleRepository } from "@/domain/authorization/role-repository";

interface CreateRoleInput {
  organizationId: string;
  roleId: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
}

export class CreateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(input: CreateRoleInput): Promise<Role> {
    if (!isValidCustomRoleId(input.roleId)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "roleId must be kebab-case and 2-63 characters",
      );
    }
    if (isSystemRoleId(input.roleId)) {
      throw new AppError(400, "VALIDATION_ERROR", "roleId is reserved");
    }
    const existing = await this.roleRepository.findById(
      input.organizationId,
      input.roleId,
    );
    if (existing) {
      throw new AppError(409, "ROLE_ALREADY_EXISTS", "Role already exists");
    }
    const role = Role.create({
      organizationId: input.organizationId,
      roleId: input.roleId,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: false,
    });
    await this.roleRepository.save(role);
    return role;
  }
}

function isValidCustomRoleId(roleId: string): boolean {
  return /^[a-z][a-z0-9-]{1,62}$/.test(roleId);
}
