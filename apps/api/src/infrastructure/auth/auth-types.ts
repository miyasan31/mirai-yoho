import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";

export interface Account {
  organizationId: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface Consultant {
  organizationId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUser {
  authUid: string;
  accounts: Account[];
  consultants: Consultant[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}
