import { DomainError } from "@mirai-yoho/shared/domain-error";

interface UserZoomConnectionCreateProps {
  zoomUserId: string;
  zoomEmail: string;
  accessTokenCipher: string;
  refreshTokenCipher: string;
  accessTokenExpiresAt: Date;
  scopes: string[];
  connectedAt: Date;
}

interface UserZoomConnectionProps extends UserZoomConnectionCreateProps {
  revokedAt?: Date;
}

export class UserZoomConnection {
  private constructor(
    private readonly zoomUserId: string,
    private readonly zoomEmail: string,
    private accessTokenCipher: string,
    private refreshTokenCipher: string,
    private accessTokenExpiresAt: Date,
    private readonly scopes: string[],
    private readonly connectedAt: Date,
    private revokedAt: Date | undefined,
  ) {}

  static create(props: UserZoomConnectionCreateProps): UserZoomConnection {
    if (!props.zoomUserId) {
      throw new DomainError(
        "INVALID_ZOOM_CONNECTION",
        "zoomUserId is required",
      );
    }
    if (!props.zoomEmail) {
      throw new DomainError("INVALID_ZOOM_CONNECTION", "zoomEmail is required");
    }
    return new UserZoomConnection(
      props.zoomUserId,
      props.zoomEmail,
      props.accessTokenCipher,
      props.refreshTokenCipher,
      props.accessTokenExpiresAt,
      [...props.scopes],
      props.connectedAt,
      undefined,
    );
  }

  static reconstruct(props: UserZoomConnectionProps): UserZoomConnection {
    return new UserZoomConnection(
      props.zoomUserId,
      props.zoomEmail,
      props.accessTokenCipher,
      props.refreshTokenCipher,
      props.accessTokenExpiresAt,
      [...props.scopes],
      props.connectedAt,
      props.revokedAt,
    );
  }

  refreshToken(
    accessTokenCipher: string,
    refreshTokenCipher: string,
    accessTokenExpiresAt: Date,
  ): void {
    if (this.revokedAt) {
      throw new DomainError(
        "ZOOM_CONNECTION_REVOKED",
        "Cannot refresh a revoked Zoom connection",
      );
    }
    this.accessTokenCipher = accessTokenCipher;
    this.refreshTokenCipher = refreshTokenCipher;
    this.accessTokenExpiresAt = accessTokenExpiresAt;
  }

  revoke(now: Date): void {
    if (this.revokedAt) return;
    this.revokedAt = now;
    this.accessTokenCipher = "";
    this.refreshTokenCipher = "";
  }

  isActive(): boolean {
    return this.revokedAt === undefined;
  }

  getZoomUserId(): string {
    return this.zoomUserId;
  }

  getZoomEmail(): string {
    return this.zoomEmail;
  }

  getAccessTokenCipher(): string {
    return this.accessTokenCipher;
  }

  getRefreshTokenCipher(): string {
    return this.refreshTokenCipher;
  }

  getAccessTokenExpiresAt(): Date {
    return this.accessTokenExpiresAt;
  }

  getScopes(): string[] {
    return [...this.scopes];
  }

  getConnectedAt(): Date {
    return this.connectedAt;
  }

  getRevokedAt(): Date | undefined {
    return this.revokedAt;
  }
}
