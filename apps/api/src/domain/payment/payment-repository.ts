import type { Payment } from "@/domain/payment/payment";

export interface IPaymentRepository {
  findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<Payment | null>;
  findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null>;
  findBySetupIntentId(setupIntentId: string): Promise<Payment | null>;
  findAll(organizationId: string): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
}
