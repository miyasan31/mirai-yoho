import type { Payment } from "@/domain/payment/payment";

export interface IPaymentRepository {
  findByBookingId(bookingId: string): Promise<Payment | null>;
  findBySetupIntentId(setupIntentId: string): Promise<Payment | null>;
  findAll(): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
}
