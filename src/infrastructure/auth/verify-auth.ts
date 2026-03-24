import type { AuthUser, UserRole } from "@/infrastructure/auth/auth-types";
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
  const decoded = await verifyIdToken(token);
  const role = (decoded.role as UserRole) ?? undefined;

  if (!role) {
    throw new AuthError(403, "NO_ROLE", "User has no assigned role");
  }

  return { uid: decoded.uid, role };
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
