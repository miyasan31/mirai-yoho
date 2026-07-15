import { AppError } from "@/application/shared/app-error";
import type { IAccountRepository } from "@/domain/account/account-repository";
import type { RoleRepository } from "@/domain/authorization/role-repository";

interface DeleteRoleInput {
  organizationId: string;
  roleId: string;
}

export class DeleteRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(input: DeleteRoleInput): Promise<void> {
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
        "System role cannot be deleted",
      );
    }
    const accounts = await this.accountRepository.findByOrganizationId(
      input.organizationId,
    );
    const isInUse = accounts.some(
      (account) => account.getRoleId() === input.roleId,
    );
    if (isInUse) {
      throw new AppError(
        409,
        "ROLE_IN_USE",
        "このロールはアカウントに割り当てられているため削除できません",
      );
    }
    await this.roleRepository.delete(input.organizationId, input.roleId);
  }
}
