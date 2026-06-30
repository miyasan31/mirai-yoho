import { DomainError } from "@/domain/shared/domain-error";

const VALID_PROVIDER_IDS = ["anonymous", "google.com", "line"] as const;
export type AuthProviderId = (typeof VALID_PROVIDER_IDS)[number];

interface AuthProviderProps {
  providerId: AuthProviderId;
  providerUid?: string;
  linkedAt: Date;
}

export class AuthProvider {
  private constructor(
    private readonly providerId: AuthProviderId,
    private readonly providerUid: string | undefined,
    private readonly linkedAt: Date,
  ) {}

  static create(props: AuthProviderProps): AuthProvider {
    if (!VALID_PROVIDER_IDS.includes(props.providerId)) {
      throw new DomainError(
        "INVALID_AUTH_PROVIDER",
        `Unknown auth provider: ${props.providerId}`,
      );
    }
    if (props.providerId !== "anonymous" && !props.providerUid) {
      throw new DomainError(
        "INVALID_AUTH_PROVIDER",
        `providerUid is required for ${props.providerId}`,
      );
    }
    return new AuthProvider(
      props.providerId,
      props.providerUid,
      props.linkedAt,
    );
  }

  static reconstruct(props: AuthProviderProps): AuthProvider {
    return new AuthProvider(
      props.providerId,
      props.providerUid,
      props.linkedAt,
    );
  }

  getProviderId(): AuthProviderId {
    return this.providerId;
  }

  getProviderUid(): string | undefined {
    return this.providerUid;
  }

  getLinkedAt(): Date {
    return this.linkedAt;
  }

  equals(other: AuthProvider): boolean {
    return (
      this.providerId === other.providerId &&
      this.providerUid === other.providerUid
    );
  }
}
