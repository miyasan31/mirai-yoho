import type { UserRole } from "@/infrastructure/auth/auth-types";

export type AdminActorRole = UserRole | null;

export type AdminPanelUserStatus = "pending" | "registered";

export function canManageAdminUsers(actorRole: AdminActorRole): boolean {
  return actorRole === "admin" || actorRole === "operator";
}

export function canInviteAdminUsers(actorRole: AdminActorRole): boolean {
  return canManageAdminUsers(actorRole);
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
  targetStatus: AdminPanelUserStatus,
): boolean {
  return actorRole === "admin" && targetStatus !== "pending";
}

export function canResendInvite(
  actorRole: AdminActorRole,
  targetStatus: AdminPanelUserStatus,
): boolean {
  return canManageAdminUsers(actorRole) && targetStatus === "pending";
}

export function canResetPassword(
  actorRole: AdminActorRole,
  targetStatus: AdminPanelUserStatus,
): boolean {
  return canManageAdminUsers(actorRole) && targetStatus !== "pending";
}

export function canDeleteAdminUser(actorRole: AdminActorRole): boolean {
  return actorRole === "admin";
}
