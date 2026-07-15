const SYSTEM_ADMIN_ROLE_ID = "admin";

export type ConsoleActorRoleId = string | null;

export type ConsolePanelAccountStatus = "active" | "invited" | "disabled";

export function canManageConsoleAccounts(
  actorRoleId: ConsoleActorRoleId,
): boolean {
  return !!actorRoleId;
}

export function canInviteConsoleAccounts(
  actorRoleId: ConsoleActorRoleId,
): boolean {
  return canManageConsoleAccounts(actorRoleId);
}

export function canEditDisplayName(
  actorRoleId: ConsoleActorRoleId,
  actorAccountId: string | undefined,
  targetAccountId: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }
  return !!actorAccountId && actorAccountId === targetAccountId;
}

export function canEditRole(
  actorRoleId: ConsoleActorRoleId,
  targetStatus: ConsolePanelAccountStatus,
): boolean {
  return actorRoleId === SYSTEM_ADMIN_ROLE_ID && targetStatus === "active";
}

export function canResendInvite(
  actorRoleId: ConsoleActorRoleId,
  targetStatus: ConsolePanelAccountStatus,
): boolean {
  return canManageConsoleAccounts(actorRoleId) && targetStatus === "invited";
}

export function canResetPassword(
  actorRoleId: ConsoleActorRoleId,
  targetStatus: ConsolePanelAccountStatus,
): boolean {
  return canManageConsoleAccounts(actorRoleId) && targetStatus === "active";
}

export function canDeleteConsoleAccount(
  actorRoleId: ConsoleActorRoleId,
): boolean {
  return canManageConsoleAccounts(actorRoleId);
}
