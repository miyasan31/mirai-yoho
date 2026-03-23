import { DomainError } from "@/domain/shared/domainError";

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export type BookingStatusValue = (typeof VALID_STATUSES)[number];

export class BookingStatus {
  private constructor(private readonly value: BookingStatusValue) {}

  static create(value: string): BookingStatus {
    if (!VALID_STATUSES.includes(value as BookingStatusValue)) {
      throw new DomainError(
        "INVALID_BOOKING_STATUS",
        `Invalid status: ${value}`,
      );
    }
    return new BookingStatus(value as BookingStatusValue);
  }

  static reconstruct(value: string): BookingStatus {
    return new BookingStatus(value as BookingStatusValue);
  }

  getValue(): BookingStatusValue {
    return this.value;
  }

  equals(other: BookingStatus): boolean {
    return this.value === other.getValue();
  }
}
