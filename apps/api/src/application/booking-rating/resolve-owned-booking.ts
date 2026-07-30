import { AppError } from "@/application/shared/app-error";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

/**
 * ログイン会員が所有する予約を解決する。
 *
 * 他人の予約と存在しない予約を区別せず一律 404 にすることで、
 * 予約 ID の存在推測を防ぐ（me-bookings.ts の CANCEL と同じ方針）。
 */
export async function resolveOwnedBooking(params: {
  bookingRepository: IBookingRepository;
  customerRepository: ICustomerRepository;
  userId: string;
  bookingId: string;
}): Promise<Booking> {
  const { bookingRepository, customerRepository, userId, bookingId } = params;

  const customers = await customerRepository.findByUserId(userId);
  if (customers.length === 0) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  const bookings = await bookingRepository.findAllByCustomerIds(
    customers.map((customer) => customer.getCustomerId()),
  );
  const booking = bookings.find(
    (candidate) => candidate.getBookingId() === bookingId,
  );
  if (!booking) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return booking;
}
