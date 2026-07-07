import {
  AUTHORIZATION_PERMISSIONS,
  type AuthorizationPermission,
  normalizePermissions,
} from "@mirai-yoho/shared/authorization-permission";

export const SYSTEM_ADMIN_ROLE_ID = "admin";
export const SYSTEM_OPERATOR_ROLE_ID = "operator";

export interface OrganizationRoleProps {
  organizationId: string;
  roleId: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationRole {
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

  static create(
    props: Omit<OrganizationRoleProps, "createdAt" | "updatedAt">,
  ): OrganizationRole {
    const now = new Date();
    return new OrganizationRole(
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

  static reconstruct(props: OrganizationRoleProps): OrganizationRole {
    return new OrganizationRole(
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

  static createSystemAdmin(organizationId: string): OrganizationRole {
    return OrganizationRole.create({
      organizationId,
      roleId: SYSTEM_ADMIN_ROLE_ID,
      name: "管理者",
      description: "すべての管理機能を利用できる保護ロール",
      permissions: [...AUTHORIZATION_PERMISSIONS],
      isSystem: true,
    });
  }

  static createSystemOperator(organizationId: string): OrganizationRole {
    return OrganizationRole.create({
      organizationId,
      roleId: SYSTEM_OPERATOR_ROLE_ID,
      name: "オペレーター",
      description: "日常運用向けの標準ロール",
      permissions: normalizePermissions([
        "admin.dashboard.read",
        "admin.bookings.read",
        "admin.bookings.cancel",
        "admin.payments.read",
        "admin.payments.charge",
        "admin.customers.read",
        "admin.consultants.read",
        "admin.consultants.manage",
        "admin.slots.read",
        "admin.slots.manage",
        "admin.settings.read",
        "admin.accounts.read",
        "admin.accounts.display-name.manage",
        "admin.accounts.invite.resend",
        "admin.accounts.password-reset",
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

export function createSystemOrganizationRole(
  organizationId: string,
  roleId: string,
): OrganizationRole | null {
  if (roleId === SYSTEM_ADMIN_ROLE_ID) {
    return OrganizationRole.createSystemAdmin(organizationId);
  }
  if (roleId === SYSTEM_OPERATOR_ROLE_ID) {
    return OrganizationRole.createSystemOperator(organizationId);
  }
  return null;
}

export function isSystemOrganizationRoleId(roleId: string): boolean {
  return roleId === SYSTEM_ADMIN_ROLE_ID || roleId === SYSTEM_OPERATOR_ROLE_ID;
}
