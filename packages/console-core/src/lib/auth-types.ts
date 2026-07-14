import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";

export interface Account {
  organizationId: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  isConsultant: boolean;
  status: "active" | "invited" | "disabled";
  createdAt: string;
}
