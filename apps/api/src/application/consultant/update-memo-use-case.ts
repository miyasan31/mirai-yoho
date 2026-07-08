import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";

interface UpdateMemoInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerName: string;
  birthDate: string;
  appraisalDate: string;
  freeMemo: string;
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

    booking.updateMemo(
      ConsultantMemo.create({
        customerName: input.customerName,
        birthDate: input.birthDate,
        appraisalDate: input.appraisalDate,
        freeMemo: input.freeMemo,
      }),
    );
    await this.bookingRepository.save(booking);
  }
}
