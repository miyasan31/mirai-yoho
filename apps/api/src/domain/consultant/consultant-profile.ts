import { DomainError } from "@mirai-yoho/shared/domain-error";

export class ConsultantProfile {
  private constructor(
    private readonly name: string,
    private readonly bio: string,
    private readonly specialties: readonly string[],
    private readonly phone: string,
    private readonly imageUrl?: string,
  ) {}

  static create(
    name: string,
    bio: string,
    specialties: string[],
    phone = "",
    imageUrl?: string,
  ): ConsultantProfile {
    if (!name || name.trim().length === 0) {
      throw new DomainError(
        "INVALID_DISPLAY_NAME",
        "Display name must not be empty",
      );
    }
    return new ConsultantProfile(name, bio, [...specialties], phone, imageUrl);
  }

  static reconstruct(
    name: string,
    bio: string,
    specialties: string[],
    phone = "",
    imageUrl?: string,
  ): ConsultantProfile {
    return new ConsultantProfile(name, bio, [...specialties], phone, imageUrl);
  }

  getDisplayName(): string {
    return this.name;
  }

  getBio(): string {
    return this.bio;
  }

  getSpecialties(): readonly string[] {
    return this.specialties;
  }

  getPhone(): string {
    return this.phone;
  }

  getImageUrl(): string | undefined {
    return this.imageUrl;
  }

  equals(other: ConsultantProfile): boolean {
    return (
      this.name === other.name &&
      this.bio === other.bio &&
      this.phone === other.phone &&
      this.imageUrl === other.imageUrl &&
      this.specialties.length === other.specialties.length &&
      this.specialties.every((s, i) => s === other.specialties[i])
    );
  }
}
