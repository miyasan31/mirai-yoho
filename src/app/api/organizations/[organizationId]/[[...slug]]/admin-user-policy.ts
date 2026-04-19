import type { UserRole } from "@/infrastructure/auth/auth-types";

export function canUpdateDisplayNameTarget(
  actorRole: UserRole,
  actorUid: string,
  targetUid: string,
): boolean {
  if (actorRole === "admin") {
    return true;
  }

  return actorRole === "operator" && actorUid === targetUid;
}

export function isLastAdminSelfDemotion(params: {
  actorUid: string;
  targetUid: string;
  nextRole: "admin" | "operator";
  activeAdminCount: number;
}): boolean {
  return (
    params.actorUid === params.targetUid &&
    params.nextRole === "operator" &&
    params.activeAdminCount <= 1
  );
}

export function validateAdminUserDeletionTarget(
  actorUid: string,
  targetUid: string,
  targetRole: UserRole,
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
