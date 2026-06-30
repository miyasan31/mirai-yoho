export type AdminActorRole = string | null;

export type AdminPanelAccountStatus = "pending" | "registered";

export function canManageAdminAccounts(actorRole: AdminActorRole): boolean {
  return !!actorRole && actorRole !== "consultant";
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

  if (actorRole === "operator") {
    return !!actorUid && actorUid === targetUid;
  }

  return true;
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
  return canManageAdminAccounts(actorRole);
}
