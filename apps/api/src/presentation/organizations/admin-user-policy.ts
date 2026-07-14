export function canUpdateDisplayNameTarget(
  actorRole: string,
  actorAuthUid: string,
  targetAuthUid: string,
): boolean {
  if (actorRole === "admin") {
    return true;
  }

  if (actorRole === "operator") {
    return actorAuthUid === targetAuthUid;
  }

  return true;
}

export function isLastAdminSelfDemotion(params: {
  actorAuthUid: string;
  targetAuthUid: string;
  nextRole: string;
  activeAdminCount: number;
}): boolean {
  return (
    params.actorAuthUid === params.targetAuthUid &&
    params.nextRole !== "admin" &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorAuthUid: string,
  targetAuthUid: string,
  targetRole: string,
): { isAllowed: boolean; message?: string } {
  if (actorAuthUid === targetAuthUid) {
    return {
      isAllowed: false,
      message: "自分自身は削除できません",
    };
  }

  if (targetRole === "consultant") {
    return {
      isAllowed: false,
      message: "consultant must be managed from consultant management",
    };
  }

  return { isAllowed: true };
}
