import type {
  IUserZoomOAuthService,
  ZoomTokenResult,
  ZoomUserInfo,
} from "@/application/shared/zoom-user-oauth-service";

const STUB_ACCESS_TOKEN = "stub-zoom-access-token";
const STUB_REFRESH_TOKEN = "stub-zoom-refresh-token";
const STUB_ZOOM_USER_ID = "stub-zoom-user";
const STUB_ZOOM_EMAIL = "local-dev@zoom.stub";
const STUB_ZOOM_DISPLAY_NAME = "Local Dev";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export class StubZoomUserOAuthService implements IUserZoomOAuthService {
  buildAuthorizeUrl(params: { state: string; redirectUri: string }): string {
    const separator = params.redirectUri.includes("?") ? "&" : "?";
    return `${params.redirectUri}${separator}code=stub-zoom-code&state=${encodeURIComponent(params.state)}`;
  }

  async exchangeCode(_params: {
    code: string;
    redirectUri: string;
  }): Promise<ZoomTokenResult> {
    return {
      accessToken: STUB_ACCESS_TOKEN,
      refreshToken: STUB_REFRESH_TOKEN,
      expiresInSeconds: ONE_YEAR_SECONDS,
      scopes: ["user:read"],
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<ZoomTokenResult> {
    return {
      accessToken: STUB_ACCESS_TOKEN,
      refreshToken: STUB_REFRESH_TOKEN,
      expiresInSeconds: ONE_YEAR_SECONDS,
      scopes: ["user:read"],
    };
  }

  async fetchUser(_accessToken: string): Promise<ZoomUserInfo> {
    return {
      zoomUserId: STUB_ZOOM_USER_ID,
      zoomEmail: STUB_ZOOM_EMAIL,
      displayName: STUB_ZOOM_DISPLAY_NAME,
    };
  }

  async revokeToken(_accessToken: string): Promise<void> {
    console.info("[ZoomStub] revokeToken");
  }
}
