import { SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/role";

export function canUpdateDisplayNameTarget(
  actorRoleId: string,
  actorUid: string,
  targetUid: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }

  return actorUid === targetUid;
}

export function isLastAdminSelfDemotion(params: {
  actorUid: string;
  targetUid: string;
  nextRoleId: string;
  activeAdminCount: number;
}): boolean {
  return (
    params.actorUid === params.targetUid &&
    params.nextRoleId !== SYSTEM_ADMIN_ROLE_ID &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorUid: string,
  targetUid: string,
): { isAllowed: boolean; message?: string } {
  if (actorUid === targetUid) {
    return {
      isAllowed: false,
      message: "自分自身は削除できません",
    };
  }

  return { isAllowed: true };
}
