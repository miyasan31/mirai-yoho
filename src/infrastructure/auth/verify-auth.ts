import type { AuthUser } from "@/infrastructure/auth/auth-types";
import {
  activateInvitedAccounts,
  loadAuthUser,
} from "@/infrastructure/auth/load-auth-context";
import { verifyIdToken } from "@/infrastructure/firebase/firebase-auth-admin";

export async function verifyAuth(request: Request): Promise<AuthUser> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthError(
      401,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header",
    );
  }

  const token = authorization.slice(7);
  let decoded: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    throw new AuthError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  await activateInvitedAccounts(decoded.uid);
  const authUser = await loadAuthUser(decoded.uid);

  if (authUser.accounts.length === 0) {
    throw new AuthError(403, "NO_ROLE", "User has no assigned role");
  }

  return authUser;
}

export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
