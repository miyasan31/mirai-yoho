import type { Booking } from "@/domain/booking/booking";

export interface IBookingRepository {
  findById(bookingId: string): Promise<Booking | null>;
  save(booking: Booking): Promise<void>;
}
