const SYSTEM_ADMIN_ROLE_ID = "admin";

export type AdminActorRoleId = string | null;

export type AdminPanelAccountStatus = "active" | "invited" | "disabled";

export function canManageAdminAccounts(actorRoleId: AdminActorRoleId): boolean {
  return !!actorRoleId;
}

export function canInviteAdminAccounts(actorRoleId: AdminActorRoleId): boolean {
  return canManageAdminAccounts(actorRoleId);
}

export function canEditDisplayName(
  actorRoleId: AdminActorRoleId,
  actorAccountId: string | undefined,
  targetAccountId: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }
  return !!actorAccountId && actorAccountId === targetAccountId;
}

export function canEditRole(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return actorRoleId === SYSTEM_ADMIN_ROLE_ID && targetStatus === "active";
}

export function canResendInvite(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRoleId) && targetStatus === "invited";
}

export function canResetPassword(
  actorRoleId: AdminActorRoleId,
  targetStatus: AdminPanelAccountStatus,
): boolean {
  return canManageAdminAccounts(actorRoleId) && targetStatus === "active";
}

export function canDeleteAdminAccount(actorRoleId: AdminActorRoleId): boolean {
  return canManageAdminAccounts(actorRoleId);
}
