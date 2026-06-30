import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyIdToken } from "@/infrastructure/firebase/firebase-auth-admin";

export interface CustomerAuthContext {
  authUid: string;
  providerIds: string[];
}

export async function verifyCustomerAuth(
  request: Request,
): Promise<CustomerAuthContext> {
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
    const providerIds: string[] = [];
    if (decoded.firebase?.sign_in_provider) {
      providerIds.push(decoded.firebase.sign_in_provider);
    }
    return { authUid: decoded.uid, providerIds };
  } catch {
    throw new AuthError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}
