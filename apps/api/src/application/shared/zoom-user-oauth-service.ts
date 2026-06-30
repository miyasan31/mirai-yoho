export interface ZoomTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scopes: string[];
}

export interface ZoomUserInfo {
  zoomUserId: string;
  zoomEmail: string;
  displayName: string;
}

export interface IUserZoomOAuthService {
  buildAuthorizeUrl(params: { state: string; redirectUri: string }): string;
  exchangeCode(params: {
    code: string;
    redirectUri: string;
  }): Promise<ZoomTokenResult>;
  refreshAccessToken(refreshToken: string): Promise<ZoomTokenResult>;
  fetchUser(accessToken: string): Promise<ZoomUserInfo>;
  revokeToken(accessToken: string): Promise<void>;
}
