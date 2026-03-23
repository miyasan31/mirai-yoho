import { DomainError } from "@/domain/shared/domain-error";

export class ConsultantProfile {
  private constructor(
    private readonly displayName: string,
    private readonly bio: string,
    private readonly specialties: readonly string[],
  ) {}

  static create(
    displayName: string,
    bio: string,
    specialties: string[],
  ): ConsultantProfile {
    if (!displayName || displayName.trim().length === 0) {
      throw new DomainError(
        "INVALID_DISPLAY_NAME",
        "Display name must not be empty",
      );
    }
    return new ConsultantProfile(displayName, bio, [...specialties]);
  }

  static reconstruct(
    displayName: string,
    bio: string,
    specialties: string[],
  ): ConsultantProfile {
    return new ConsultantProfile(displayName, bio, [...specialties]);
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getBio(): string {
    return this.bio;
  }

  getSpecialties(): readonly string[] {
    return this.specialties;
  }

  equals(other: ConsultantProfile): boolean {
    return (
      this.displayName === other.displayName &&
      this.bio === other.bio &&
      this.specialties.length === other.specialties.length &&
      this.specialties.every((s, i) => s === other.specialties[i])
    );
  }
}
