const SYSTEM_ADMIN_ROLE_ID = "admin";

export type AdminActorRoleId = string | null;

export type AdminPanelAccountStatus = "pending" | "registered";

export function canManageAdminAccounts(actorRoleId: AdminActorRoleId): boolean {
  return !!actorRoleId;
}

export function canInviteAdminAccounts(actorRoleId: AdminActorRoleId): boolean {
  return canManageAdminAccounts(actorRoleId);
}

export function canEditDisplayName(
  actorRoleId: AdminActorRoleId,
  actorAuthUid: string | undefined,
  targetAuthUid: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }
  return !!actorAuthUid && actorAuthUid === targetAuthUid;
}

export function canEditRole(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return actorRoleId === SYSTEM_ADMIN_ROLE_ID && targetStatus !== "pending";
}

export function canResendInvite(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRoleId) && targetStatus === "pending";
}

export function canResetPassword(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRoleId) && targetStatus !== "pending";
}

export function canDeleteAdminAccount(actorRoleId: AdminActorRoleId): boolean {
  return canManageAdminAccounts(actorRoleId);
}
