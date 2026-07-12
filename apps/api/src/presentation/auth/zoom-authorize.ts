import { envServer } from "@/config/env.server";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import { signZoomOAuthState } from "@/infrastructure/auth/zoom-oauth-state";
import { createZoomUserOAuthService } from "@/infrastructure/container";
import { withNoStore } from "../cache-control";

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(Response.json({ code, message }, { status: statusCode }));
}

export async function POST(request: Request) {
  try {
    const { authUid } = await verifyCustomerAuth(request);
    const state = signZoomOAuthState({
      authUid,
      secret: envServer.zoomOAuthStateSecret,
    });
    const url = createZoomUserOAuthService().buildAuthorizeUrl({
      state,
      redirectUri: envServer.zoomUserOAuthRedirectUri,
    });
    return withNoStore(Response.json({ url }));
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.statusCode, error.code, error.message);
    }
    return jsonError(500, "INTERNAL_ERROR", "Internal server error");
  }
}
