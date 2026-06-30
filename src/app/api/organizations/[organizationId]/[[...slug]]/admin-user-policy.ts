export function canUpdateDisplayNameTarget(
  actorRole: string,
  actorUid: string,
  targetUid: string,
): boolean {
  if (actorRole === "admin") {
    return true;
  }

  if (actorRole === "operator") {
    return actorUid === targetUid;
  }

  return true;
}

export function isLastAdminSelfDemotion(params: {
  actorUid: string;
  targetUid: string;
  nextRole: string;
  activeAdminCount: number;
}): boolean {
  return (
    params.actorUid === params.targetUid &&
    params.nextRole !== "admin" &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorUid: string,
  targetUid: string,
  targetRole: string,
): { isAllowed: boolean; message?: string } {
  if (actorUid === targetUid) {
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
