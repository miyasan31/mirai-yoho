import type { Booking } from "@/domain/booking/booking";

export interface IBookingRepository {
  findById(bookingId: string): Promise<Booking | null>;
  findByConsultantId(consultantId: string): Promise<Booking[]>;
  findByStatus(status: string): Promise<Booking[]>;
  findAll(): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
}
