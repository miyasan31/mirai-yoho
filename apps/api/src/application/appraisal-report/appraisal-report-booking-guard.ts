import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

/**
 * 鑑定書の対象予約を取得し、担当占い師本人であることを確認する。
 * booking.status の "completed" は「課金完了」を意味するため鑑定終了の判定には使えない。
 * 鑑定が終わったかどうかは endsAt で判定する（isBookingReportable 参照）。
 */
export async function loadOwnedBooking(
  bookingRepository: IBookingRepository,
  input: { organizationId: string; bookingId: string; consultantId: string },
): Promise<Booking> {
  const booking = await bookingRepository.findById(
    input.organizationId,
    input.bookingId,
  );
  if (!booking) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  if (booking.getConsultantId() !== input.consultantId) {
    throw new DomainError("FORBIDDEN", "You do not own this booking");
  }
  return booking;
}

export function isBookingReportable(booking: Booking, now: Date): boolean {
  return (
    booking.getStatus().getValue() !== "cancelled" &&
    booking.getEndsAt().getTime() < now.getTime()
  );
}

export function assertBookingReportable(booking: Booking, now: Date): void {
  if (booking.getStatus().getValue() === "cancelled") {
    throw new DomainError(
      "APPRAISAL_REPORT_BOOKING_CANCELLED",
      "Appraisal reports cannot be created for cancelled bookings",
    );
  }
  if (booking.getEndsAt().getTime() >= now.getTime()) {
    throw new DomainError(
      "APPRAISAL_REPORT_NOT_ALLOWED_YET",
      "Appraisal reports can be created after the consultation has ended",
    );
  }
}
