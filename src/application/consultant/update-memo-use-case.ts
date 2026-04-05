import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { DomainError } from "@/domain/shared/domain-error";

interface UpdateMemoInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  memo: string;
}

export class UpdateMemoUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(input: UpdateMemoInput): Promise<void> {
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

    booking.updateMemo(ConsultantMemo.create(input.memo));
    await this.bookingRepository.save(booking);
  }
}
