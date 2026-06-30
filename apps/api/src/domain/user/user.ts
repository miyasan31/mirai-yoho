import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";
import { AuthProvider } from "@/domain/user/auth-provider";
import type { BirthDate } from "@/domain/user/birth-date";
import { UserWithdrawnEvent } from "@/domain/user/user-withdrawn-event";
import type { UserZoomConnection } from "@/domain/user/user-zoom-connection";

const VALID_STATUSES = ["active", "withdrawn"] as const;
export type UserStatus = (typeof VALID_STATUSES)[number];

interface UserCreateAnonymousProps {
  userId: string;
  authUid: string;
  displayName: string;
  birthDate: BirthDate;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreateWithGoogleProps {
  userId: string;
  authUid: string;
  providerUid: string;
  primaryEmail: string;
  displayName: string;
  birthDate: BirthDate;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserReconstructProps {
  userId: string;
  authUid: string;
  authProviders: AuthProvider[];
  displayName: string;
  primaryEmail?: string;
  birthDate: BirthDate;
  zoomConnection?: UserZoomConnection;
  status: UserStatus;
  withdrawnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends AggregateRoot {
  private constructor(
    private readonly userId: string,
    private readonly authUid: string,
    private authProviders: AuthProvider[],
    private displayName: string,
    private primaryEmail: string | undefined,
    private birthDate: BirthDate,
    private zoomConnection: UserZoomConnection | undefined,
    private status: UserStatus,
    private withdrawnAt: Date | undefined,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static createAnonymous(props: UserCreateAnonymousProps): User {
    const now = props.createdAt ?? new Date();
    return new User(
      props.userId,
      props.authUid,
      [
        AuthProvider.create({
          providerId: "anonymous",
          linkedAt: now,
        }),
      ],
      props.displayName,
      undefined,
      props.birthDate,
      undefined,
      "active",
      undefined,
      now,
      props.updatedAt ?? now,
    );
  }

  static createWithGoogle(props: UserCreateWithGoogleProps): User {
    const now = props.createdAt ?? new Date();
    return new User(
      props.userId,
      props.authUid,
      [
        AuthProvider.create({
          providerId: "google.com",
          providerUid: props.providerUid,
          linkedAt: now,
        }),
      ],
      props.displayName,
      props.primaryEmail,
      props.birthDate,
      undefined,
      "active",
      undefined,
      now,
      props.updatedAt ?? now,
    );
  }

  static reconstruct(props: UserReconstructProps): User {
    return new User(
      props.userId,
      props.authUid,
      [...props.authProviders],
      props.displayName,
      props.primaryEmail,
      props.birthDate,
      props.zoomConnection,
      props.status,
      props.withdrawnAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  linkProvider(provider: AuthProvider): void {
    this.assertActive();
    const exists = this.authProviders.some(
      (p) => p.getProviderId() === provider.getProviderId(),
    );
    if (exists) {
      throw new DomainError(
        "PROVIDER_ALREADY_LINKED",
        `Provider ${provider.getProviderId()} is already linked`,
      );
    }
    this.authProviders = [...this.authProviders, provider];
    this.updatedAt = new Date();
  }

  updateProfile(props: {
    displayName?: string;
    primaryEmail?: string;
    birthDate?: BirthDate;
  }): void {
    this.assertActive();
    if (props.displayName !== undefined) {
      this.displayName = props.displayName;
    }
    if (props.primaryEmail !== undefined) {
      this.primaryEmail = props.primaryEmail;
    }
    if (props.birthDate !== undefined) {
      this.birthDate = props.birthDate;
    }
    this.updatedAt = new Date();
  }

  connectZoom(connection: UserZoomConnection): void {
    this.assertActive();
    this.zoomConnection = connection;
    this.updatedAt = new Date();
  }

  disconnectZoom(now: Date): void {
    if (!this.zoomConnection) {
      throw new DomainError(
        "ZOOM_NOT_CONNECTED",
        "Zoom connection does not exist",
      );
    }
    this.zoomConnection.revoke(now);
    this.updatedAt = now;
  }

  refreshZoomToken(
    accessTokenCipher: string,
    refreshTokenCipher: string,
    accessTokenExpiresAt: Date,
  ): void {
    if (!this.zoomConnection) {
      throw new DomainError(
        "ZOOM_NOT_CONNECTED",
        "Zoom connection does not exist",
      );
    }
    this.zoomConnection.refreshToken(
      accessTokenCipher,
      refreshTokenCipher,
      accessTokenExpiresAt,
    );
    this.updatedAt = new Date();
  }

  hasActiveZoomConnection(): boolean {
    return this.zoomConnection?.isActive() ?? false;
  }

  getZoomEmail(): string | undefined {
    if (!this.zoomConnection?.isActive()) return undefined;
    return this.zoomConnection.getZoomEmail();
  }

  withdraw(now: Date): void {
    if (this.status === "withdrawn") {
      throw new DomainError("ALREADY_WITHDRAWN", "User is already withdrawn");
    }
    this.status = "withdrawn";
    this.withdrawnAt = now;
    this.updatedAt = now;
    if (this.zoomConnection?.isActive()) {
      this.zoomConnection.revoke(now);
    }
    this.addDomainEvent(
      UserWithdrawnEvent.create({
        userId: this.userId,
        authUid: this.authUid,
        withdrawnAt: now,
      }),
    );
  }

  isActive(): boolean {
    return this.status === "active";
  }

  private assertActive(): void {
    if (this.status !== "active") {
      throw new DomainError("USER_WITHDRAWN", "Cannot modify a withdrawn user");
    }
  }

  getUserId(): string {
    return this.userId;
  }

  getAuthUid(): string {
    return this.authUid;
  }

  getAuthProviders(): AuthProvider[] {
    return [...this.authProviders];
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getPrimaryEmail(): string | undefined {
    return this.primaryEmail;
  }

  getBirthDate(): BirthDate {
    return this.birthDate;
  }

  getZoomConnection(): UserZoomConnection | undefined {
    return this.zoomConnection;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  getWithdrawnAt(): Date | undefined {
    return this.withdrawnAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
