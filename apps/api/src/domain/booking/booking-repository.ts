import type { Booking } from "@/domain/booking/booking";

export interface IBookingRepository {
  findById(organizationId: string, bookingId: string): Promise<Booking | null>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Booking[]>;
  findByStatus(organizationId: string, status: string): Promise<Booking[]>;
  findConsultationReminderTargets(
    organizationId: string,
    now: Date,
    windowEnd: Date,
  ): Promise<Booking[]>;
  findAll(organizationId: string): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
}
