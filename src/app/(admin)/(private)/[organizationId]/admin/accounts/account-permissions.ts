import type { UserRole } from "@/infrastructure/auth/auth-types";

export type AdminActorRole = UserRole | null;

export type AdminPanelAccountStatus = "pending" | "registered";

export function canManageAdminAccounts(actorRole: AdminActorRole): boolean {
  return actorRole === "admin" || actorRole === "operator";
}

export function canInviteAdminAccounts(actorRole: AdminActorRole): boolean {
  return canManageAdminAccounts(actorRole);
}

export function canEditDisplayName(
  actorRole: AdminActorRole,
  actorUid: string | undefined,
  targetUid: string,
): boolean {
  if (actorRole === "admin") {
    return true;
  }

  return actorRole === "operator" && !!actorUid && actorUid === targetUid;
}

export function canEditRole(
  actorRole: AdminActorRole,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return actorRole === "admin" && targetStatus !== "pending";
}

export function canResendInvite(
  actorRole: AdminActorRole,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRole) && targetStatus === "pending";
}

export function canResetPassword(
  actorRole: AdminActorRole,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRole) && targetStatus !== "pending";
}

export function canDeleteAdminAccount(actorRole: AdminActorRole): boolean {
  return actorRole === "admin";
}
