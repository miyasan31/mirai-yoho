import { envServer } from "@/config/env.server";
import { verifyZoomOAuthState } from "@/infrastructure/auth/zoom-oauth-state";
import { createConnectZoomAccountUseCase } from "@/infrastructure/container";

const FAILURE_PATH = "/mypage/zoom?status=error";
const SUCCESS_PATH = "/mypage/zoom?status=connected";

function redirect(path: string, base: string) {
  const url = new URL(path, base);
  return Response.redirect(url, 307);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");

  if (error || !code || !state) {
    return redirect(
      `${FAILURE_PATH}&reason=missing_params`,
      envServer.userAppUrl,
    );
  }

  let authUid: string;
  try {
    const verified = verifyZoomOAuthState({
      state,
      secret: envServer.zoomOAuthStateSecret,
    });
    authUid = verified.authUid;
  } catch {
    return redirect(
      `${FAILURE_PATH}&reason=invalid_state`,
      envServer.userAppUrl,
    );
  }

  try {
    await createConnectZoomAccountUseCase().execute({
      authUid,
      code,
      redirectUri: envServer.zoomUserOAuthRedirectUri,
    });
    return redirect(SUCCESS_PATH, envServer.userAppUrl);
  } catch {
    return redirect(
      `${FAILURE_PATH}&reason=exchange_failed`,
      envServer.userAppUrl,
    );
  }
}
