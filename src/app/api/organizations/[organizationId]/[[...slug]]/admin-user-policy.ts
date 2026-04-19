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
