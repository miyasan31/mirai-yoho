import {
  AUTHORIZATION_PERMISSIONS,
  type AuthorizationPermission,
  normalizePermissions,
} from "@mirai-yoho/shared/authorization-permission";

export const SYSTEM_ADMIN_ROLE_ID = "admin";
export const SYSTEM_OPERATOR_ROLE_ID = "operator";

export interface RoleProps {
  organizationId: string;
  roleId: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Role {
  private constructor(
    private readonly organizationId: string,
    private readonly roleId: string,
    private name: string,
    private description: string,
    private permissions: AuthorizationPermission[],
    private readonly isSystem: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(props: Omit<RoleProps, "createdAt" | "updatedAt">): Role {
    const now = new Date();
    return new Role(
      props.organizationId,
      props.roleId,
      props.name,
      props.description,
      normalizePermissions(props.permissions),
      props.isSystem,
      now,
      now,
    );
  }

  static reconstruct(props: RoleProps): Role {
    return new Role(
      props.organizationId,
      props.roleId,
      props.name,
      props.description,
      normalizePermissions(props.permissions),
      props.isSystem,
      props.createdAt,
      props.updatedAt,
    );
  }

  static createSystemAdmin(organizationId: string): Role {
    return Role.create({
      organizationId,
      roleId: SYSTEM_ADMIN_ROLE_ID,
      name: "管理者",
      description: "すべての管理機能を利用できる保護ロール",
      permissions: [...AUTHORIZATION_PERMISSIONS],
      isSystem: true,
    });
  }

  static createSystemOperator(organizationId: string): Role {
    return Role.create({
      organizationId,
      roleId: SYSTEM_OPERATOR_ROLE_ID,
      name: "オペレーター",
      description: "日常運用向けの標準ロール",
      permissions: normalizePermissions([
        "console.dashboard.read",
        "console.bookings.read",
        "console.bookings.cancel",
        "console.payments.read",
        "console.payments.charge",
        "console.customers.read",
        "console.consultants.read",
        "console.consultants.manage",
        "console.slots.read",
        "console.slots.manage",
        "console.settings.read",
        "console.policies.read",
        "console.accounts.read",
        "console.accounts.display-name.manage",
        "console.accounts.invite.resend",
        "console.accounts.password-reset",
      ]),
      isSystem: true,
    });
  }

  update(params: {
    name: string;
    description: string;
    permissions: AuthorizationPermission[];
  }): void {
    this.name = params.name;
    this.description = params.description;
    this.permissions = normalizePermissions(params.permissions);
    this.updatedAt = new Date();
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getRoleId(): string {
    return this.roleId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPermissions(): AuthorizationPermission[] {
    return [...this.permissions];
  }

  getIsSystem(): boolean {
    return this.isSystem;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}

export function createSystemRole(
  organizationId: string,
  roleId: string,
): Role | null {
  if (roleId === SYSTEM_ADMIN_ROLE_ID) {
    return Role.createSystemAdmin(organizationId);
  }
  if (roleId === SYSTEM_OPERATOR_ROLE_ID) {
    return Role.createSystemOperator(organizationId);
  }
  return null;
}

export function isSystemRoleId(roleId: string): boolean {
  return roleId === SYSTEM_ADMIN_ROLE_ID || roleId === SYSTEM_OPERATOR_ROLE_ID;
}
