import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

interface ConsultantCancelBookingInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  now?: Date;
}

/**
 * 相談員都合の予約キャンセル（キャンセルポリシー5条準拠）。
 * 予約に紐づく consultantId と一致することを検証したうえで、
 * CancelBookingUseCase に cancelledBy="consultant" で委譲する。
 * キャンセル料は常に none（全額返金）となる。
 */
export class ConsultantCancelBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  async execute(input: ConsultantCancelBookingInput): Promise<void> {
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

    await this.cancelBookingUseCase.execute({
      organizationId: input.organizationId,
      bookingId: input.bookingId,
      cancelledBy: "consultant",
      now: input.now,
    });
  }
}
