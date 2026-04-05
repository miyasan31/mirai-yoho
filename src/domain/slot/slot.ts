import { AggregateRoot } from "@/domain/shared/aggregate-root";
import { DomainError } from "@/domain/shared/domain-error";
import type { TimeRange } from "@/domain/slot/time-range";

interface SlotCreateProps {
  organizationId: string;
  slotId: string;
  consultantId: string;
  timeRange: TimeRange;
}

interface SlotProps extends SlotCreateProps {
  bookingId?: string;
  isReserved: boolean;
}

export class Slot extends AggregateRoot {
  private constructor(
    private readonly organizationId: string,
    private readonly slotId: string,
    private readonly consultantId: string,
    private readonly timeRange: TimeRange,
    private bookingId: string | undefined,
    private isReserved: boolean,
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
      false,
    );
  }

  static reconstruct(props: SlotProps): Slot {
    return new Slot(
      props.organizationId,
      props.slotId,
      props.consultantId,
      props.timeRange,
      props.bookingId,
      props.isReserved,
    );
  }

  reserve(bookingId: string): void {
    if (this.isReserved) {
      throw new DomainError(
        "SLOT_ALREADY_RESERVED",
        "This slot is already reserved",
      );
    }
    if (this.timeRange.getStartAt() < new Date()) {
      throw new DomainError(
        "SLOT_IN_PAST",
        "Cannot reserve a slot in the past",
      );
    }
    this.bookingId = bookingId;
    this.isReserved = true;
  }

  release(): void {
    if (!this.isReserved) {
      throw new DomainError("SLOT_NOT_RESERVED", "This slot is not reserved");
    }
    this.bookingId = undefined;
    this.isReserved = false;
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

  getIsReserved(): boolean {
    return this.isReserved;
  }
}
