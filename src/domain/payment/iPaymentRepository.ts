import type { Payment } from "@/domain/payment/payment";

export interface IPaymentRepository {
  findByBookingId(bookingId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
}
