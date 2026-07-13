import type { AuthorizationPermission } from "@mirai-yoho/shared/authorization-permission";

export interface Account {
  organizationId: string;
  name: string;
  role: string;
  roleName: string;
  permissions: AuthorizationPermission[];
  status: "active" | "invited" | "disabled";
  createdAt: string;
}
