import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";
import { isBeforeBookingDeadline } from "@/domain/slot/slot-availability";
import type { TimeRange } from "@/domain/slot/time-range";

interface SlotCreateProps {
  organizationId: string;
  slotId: string;
  consultantId: string;
  timeRange: TimeRange;
}

interface SlotProps extends SlotCreateProps {
  bookingId?: string;
  isAvailable: boolean;
}

export class Slot extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly slotId: string,
    private readonly consultantId: string,
    private readonly timeRange: TimeRange,
    private bookingId: string | undefined,
    private isAvailable: boolean,
  ) {
    super();
  }

  static create(props: SlotCreateProps): Slot {
    return new Slot(
      props.organizationId,
      props.slotId,
      props.consultantId,
      props.timeRange,
      undefined,
      true,
    );
  }

  static reconstruct(props: SlotProps): Slot {
    return new Slot(
      props.organizationId,
      props.slotId,
      props.consultantId,
      props.timeRange,
      props.bookingId,
      props.isAvailable,
    );
  }

  reserve(bookingId: string): void {
    if (!this.isAvailable) {
      throw new DomainError(
        "SLOT_ALREADY_RESERVED",
        "This slot is already reserved",
      );
    }
    if (this.timeRange.getStartsAt() < new Date()) {
      throw new DomainError(
        "SLOT_IN_PAST",
        "Cannot reserve a slot in the past",
      );
    }
    if (!isBeforeBookingDeadline(this.timeRange.getStartsAt())) {
      throw new DomainError(
        "BOOKING_CUTOFF_EXCEEDED",
        "Reservations must be made at least 15 minutes before the start time",
      );
    }
    this.bookingId = bookingId;
    this.isAvailable = false;
  }

  release(): void {
    if (this.isAvailable) {
      throw new DomainError("SLOT_NOT_RESERVED", "This slot is not reserved");
    }
    this.bookingId = undefined;
    this.isAvailable = true;
  }

  getSlotId(): string {
    return this.slotId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getTimeRange(): TimeRange {
    return this.timeRange;
  }

  getBookingId(): string | undefined {
    return this.bookingId;
  }

  getIsAvailable(): boolean {
    return this.isAvailable;
  }
}
