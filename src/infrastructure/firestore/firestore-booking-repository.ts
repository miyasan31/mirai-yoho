import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

export class FirestoreBookingRepository implements IBookingRepository {
  async findById(_bookingId: string): Promise<Booking | null> {
    throw new Error("Not implemented");
  }

  async save(_booking: Booking): Promise<void> {
    throw new Error("Not implemented");
  }
}
