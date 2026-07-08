import type {
  IUserZoomOAuthService,
  ZoomTokenResult,
  ZoomUserInfo,
} from "@/application/shared/zoom-user-oauth-service";
import { envServer } from "@/config/env.server";

const ZOOM_OAUTH_BASE = "https://zoom.us/oauth";
const ZOOM_API_BASE = "https://api.zoom.us/v2";
const DEFAULT_SCOPES = ["user:read"];

interface ZoomTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

interface ZoomUsersMeResponse {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

function basicAuthHeader(): string {
  const credentials = Buffer.from(
    `${envServer.zoomUserOAuthClientId}:${envServer.zoomUserOAuthClientSecret}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

function toTokenResult(data: ZoomTokenResponse): ZoomTokenResult {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInSeconds: data.expires_in,
    scopes: data.scope?.split(" ") ?? [...DEFAULT_SCOPES],
  };
}

export class ZoomUserOAuthService implements IUserZoomOAuthService {
  buildAuthorizeUrl(params: { state: string; redirectUri: string }): string {
    const url = new URL(`${ZOOM_OAUTH_BASE}/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", envServer.zoomUserOAuthClientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<ZoomTokenResult> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    });
    const response = await fetch(`${ZOOM_OAUTH_BASE}/token`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Zoom token exchange failed: ${response.status}`);
    }
    const data = (await response.json()) as ZoomTokenResponse;
    return toTokenResult(data);
  }

  async refreshAccessToken(refreshToken: string): Promise<ZoomTokenResult> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await fetch(`${ZOOM_OAUTH_BASE}/token`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Zoom token refresh failed: ${response.status}`);
    }
    const data = (await response.json()) as ZoomTokenResponse;
    return toTokenResult(data);
  }

  async fetchUser(accessToken: string): Promise<ZoomUserInfo> {
    const response = await fetch(`${ZOOM_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Zoom users/me failed: ${response.status}`);
    }
    const data = (await response.json()) as ZoomUsersMeResponse;
    const displayName =
      data.display_name ??
      [data.first_name, data.last_name].filter(Boolean).join(" ") ??
      data.email;
    return {
      zoomUserId: data.id,
      zoomEmail: data.email,
      displayName,
    };
  }

  async revokeToken(accessToken: string): Promise<void> {
    const body = new URLSearchParams({ token: accessToken });
    const response = await fetch(`${ZOOM_OAUTH_BASE}/revoke`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok && response.status !== 400) {
      throw new Error(`Zoom token revoke failed: ${response.status}`);
    }
  }
}
