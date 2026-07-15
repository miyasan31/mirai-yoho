import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";
import { AppError } from "@/application/shared/app-error";
import type { Role } from "@/domain/authorization/role";
import type { RoleRepository } from "@/domain/authorization/role-repository";

interface UpdateRoleInput {
  organizationId: string;
  roleId: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
}

export class UpdateRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(input: UpdateRoleInput): Promise<Role> {
    const role = await this.roleRepository.findById(
      input.organizationId,
      input.roleId,
    );
    if (!role) {
      throw new AppError(404, "NOT_FOUND", "Role not found");
    }
    if (role.getIsSystem()) {
      throw new AppError(
        400,
        "SYSTEM_ROLE_IMMUTABLE",
        "System role cannot be edited",
      );
    }
    role.update({
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    });
    await this.roleRepository.save(role);
    return role;
  }
}
