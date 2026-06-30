import type { AuthorizationPermission } from "@/domain/authorization/authorization-permission";

export type UserRole = "admin" | "operator" | "consultant";

export interface OrganizationAccount {
  organizationId: string;
  name: string;
  role: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface AuthUser {
  uid: string;
  accounts: OrganizationAccount[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}
