import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

interface MarkConsultantJoinedInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  joinedAt: Date;
}

export class MarkConsultantJoinedUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(input: MarkConsultantJoinedInput): Promise<void> {
    const booking = await this.bookingRepository.findById(
      input.organizationId,
      input.bookingId,
    );
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.getConsultantId() !== input.consultantId) {
      throw new DomainError("FORBIDDEN", "You do not own this booking");
    }

    booking.markConsultantJoined(input.joinedAt);
    await this.bookingRepository.save(booking);
  }
}
