import type {
  AccountAuthUser,
  AuthUser,
  ConsultantAuthUser,
} from "@/infrastructure/auth/auth-types";
import {
  activateInvitedAccounts,
  loadAccountAuthUser,
  loadAuthUser,
  loadConsultantAuthUser,
} from "@/infrastructure/auth/load-auth-context";
import { verifyIdToken } from "@/infrastructure/firebase/firebase-auth-admin";

async function verifyAuthToken(request: Request): Promise<string> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthError(
      401,
      "UNAUTHORIZED",
      "Missing or invalid Authorization header",
    );
  }

  const token = authorization.slice(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new AuthError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

/**
 * console (admin/operator) 系ルートで使う。accounts が空なら NO_ROLE。
 */
export async function verifyAccountAuth(
  request: Request,
): Promise<AccountAuthUser> {
  const uid = await verifyAuthToken(request);
  await activateInvitedAccounts(uid);
  const authUser = await loadAccountAuthUser(uid);
  if (authUser.accounts.length === 0) {
    throw new AuthError(
      403,
      "NO_ROLE",
      "User is not assigned to any organization as account",
    );
  }
  return authUser;
}

/**
 * consultant 系ルートで使う。consultants が空なら NO_ROLE。
 */
export async function verifyConsultantAuth(
  request: Request,
): Promise<ConsultantAuthUser> {
  const uid = await verifyAuthToken(request);
  const authUser = await loadConsultantAuthUser(uid);
  if (authUser.consultants.length === 0) {
    throw new AuthError(
      403,
      "NO_ROLE",
      "User is not assigned to any organization as consultant",
    );
  }
  return authUser;
}

/**
 * dual-context ルート専用（slot-routes / /console/slots）。
 * accounts と consultants のどちらかがあれば OK。両方引く。
 */
export async function verifyEitherAuth(request: Request): Promise<AuthUser> {
  const uid = await verifyAuthToken(request);
  await activateInvitedAccounts(uid);
  const authUser = await loadAuthUser(uid);
  if (authUser.accounts.length === 0 && authUser.consultants.length === 0) {
    throw new AuthError(
      403,
      "NO_ROLE",
      "User is not assigned to any organization as account or consultant",
    );
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
