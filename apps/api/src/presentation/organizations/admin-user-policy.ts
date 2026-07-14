import { SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/role";

export function canUpdateDisplayNameTarget(
  actorRoleId: string,
  actorAccountId: string,
  targetAccountId: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }

  return actorAccountId === targetAccountId;
}

export function isLastAdminSelfDemotion(params: {
  actorAccountId: string;
  targetAccountId: string;
  nextRoleId: string;
  activeAdminCount: number;
}): boolean {
  return (
    params.actorAccountId === params.targetAccountId &&
    params.nextRoleId !== SYSTEM_ADMIN_ROLE_ID &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorAccountId: string,
  targetAccountId: string,
): { isAllowed: boolean; message?: string } {
  if (actorAccountId === targetAccountId) {
    return {
      isAllowed: false,
      message: "自分自身は削除できません",
    };
  }

  return { isAllowed: true };
}
