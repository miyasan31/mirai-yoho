import { DomainError } from "@mirai-yoho/shared/domain-error";

const MIN_AGE_YEARS = 18;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class BirthDate {
  private constructor(private readonly value: string) {}

  static create(value: string, referenceDate: Date): BirthDate {
    if (!ISO_DATE_PATTERN.test(value)) {
      throw new DomainError(
        "INVALID_BIRTH_DATE",
        `Birth date must be in YYYY-MM-DD format: ${value}`,
      );
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new DomainError(
        "INVALID_BIRTH_DATE",
        `Birth date is not a valid date: ${value}`,
      );
    }
    if (parsed.getTime() > referenceDate.getTime()) {
      throw new DomainError(
        "INVALID_BIRTH_DATE",
        "Birth date cannot be in the future",
      );
    }
    if (BirthDate.calculateAge(value, referenceDate) < MIN_AGE_YEARS) {
      throw new DomainError(
        "UNDERAGE",
        `User must be at least ${MIN_AGE_YEARS} years old`,
      );
    }
    return new BirthDate(value);
  }

  static reconstruct(value: string): BirthDate {
    return new BirthDate(value);
  }

  static calculateAge(birthDateIso: string, referenceDate: Date): number {
    const [year, month, day] = birthDateIso.split("-").map(Number);
    let age = referenceDate.getUTCFullYear() - year;
    const monthDiff = referenceDate.getUTCMonth() + 1 - month;
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && referenceDate.getUTCDate() < day)
    ) {
      age -= 1;
    }
    return age;
  }

  getValue(): string {
    return this.value;
  }

  getAge(referenceDate: Date): number {
    return BirthDate.calculateAge(this.value, referenceDate);
  }

  equals(other: BirthDate): boolean {
    return this.value === other.value;
  }
}
