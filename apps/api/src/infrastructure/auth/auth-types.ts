import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";

export interface Account {
  organizationId: string;
  /** 所属組織の名前 */
  name: string;
  /** その組織でのアカウント表示名 */
  displayName: string | null;
  roleId: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface Consultant {
  organizationId: string;
  /** 所属組織の名前 */
  name: string;
  /** その組織での相談員表示名 */
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccountAuthUser {
  authUid: string;
  accounts: Account[];
}

export interface ConsultantAuthUser {
  authUid: string;
  consultants: Consultant[];
}

/**
 * 両方の identity を持つ superset。dual-context ルート
 * (slot-routes / /console/slots) が両側の情報を必要とするので、
 * それらの route が verifyEitherAuth 経由で受け取る型。
 */
export interface AuthUser extends AccountAuthUser, ConsultantAuthUser {}
