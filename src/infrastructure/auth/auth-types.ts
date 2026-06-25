export type UserRole = "admin" | "operator" | "consultant";

export interface OrganizationMembership {
  organizationId: string;
  name: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
  createdAt: string;
}

export interface AuthUser {
  uid: string;
  memberships: OrganizationMembership[];
  currentOrganizationId: string | null;
  currentDisplayName: string | null;
}
