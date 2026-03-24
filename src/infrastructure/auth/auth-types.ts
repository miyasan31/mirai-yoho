export type UserRole = "super_admin" | "operator" | "consultant";

export interface AuthUser {
  uid: string;
  role: UserRole;
}
