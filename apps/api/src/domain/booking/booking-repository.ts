import type { Booking } from "@/domain/booking/booking";
import type { TransactionScope } from "@/domain/shared/transaction-scope";

export interface IBookingRepository {
  findById(organizationId: string, bookingId: string): Promise<Booking | null>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<Booking[]>;
  findByCustomerId(
    organizationId: string,
    customerId: string,
  ): Promise<Booking[]>;
  findAllByCustomerId(customerId: string): Promise<Booking[]>;
  findAllByCustomerIds(customerIds: string[]): Promise<Booking[]>;
  findByStatus(organizationId: string, status: string): Promise<Booking[]>;
  findConsultationReminderTargets(
    organizationId: string,
    now: Date,
    windowEnd: Date,
  ): Promise<Booking[]>;
  findAll(organizationId: string): Promise<Booking[]>;
  save(booking: Booking): Promise<void>;
  saveInTx(booking: Booking, tx: TransactionScope): Promise<void>;
}
