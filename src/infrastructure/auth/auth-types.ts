export type UserRole = "admin" | "operator" | "consultant";

export interface OrganizationAccount {
  organizationId: string;
  name: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface AuthUser {
  uid: string;
  accounts: OrganizationAccount[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}
