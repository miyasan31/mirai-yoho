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

export interface AccountAuthUser {
  authUid: string;
  accounts: Account[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}

export interface ConsultantAuthUser {
  authUid: string;
  consultants: Consultant[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}

/**
 * 両方の identity を持つ superset。dual-context ルート
 * (slot-routes / /console/slots) が両側の情報を必要とするので、
 * それらの route が verifyEitherAuth 経由で受け取る型。
 */
export interface AuthUser extends AccountAuthUser, ConsultantAuthUser {}
