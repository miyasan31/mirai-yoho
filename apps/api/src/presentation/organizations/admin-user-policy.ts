import { SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/role";

export function canUpdateDisplayNameTarget(
  actorRoleId: string,
  actorAuthUid: string,
  targetAuthUid: string,
): boolean {
  if (actorRoleId === SYSTEM_ADMIN_ROLE_ID) {
    return true;
  }

  return actorAuthUid === targetAuthUid;
}

export function isLastAdminSelfDemotion(params: {
  actorAuthUid: string;
  targetAuthUid: string;
  nextRoleId: string;
  activeAdminCount: number;
}): boolean {
  return (
    params.actorAuthUid === params.targetAuthUid &&
    params.nextRoleId !== SYSTEM_ADMIN_ROLE_ID &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorAuthUid: string,
  targetAuthUid: string,
): { isAllowed: boolean; message?: string } {
  if (actorAuthUid === targetAuthUid) {
    return {
      isAllowed: false,
      message: "自分自身は削除できません",
    };
  }

  return { isAllowed: true };
}
