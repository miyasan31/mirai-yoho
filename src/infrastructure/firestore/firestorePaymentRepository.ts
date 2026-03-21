import type { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/iPaymentRepository";

export class FirestorePaymentRepository implements IPaymentRepository {
  async findByBookingId(_bookingId: string): Promise<Payment | null> {
    throw new Error("Not implemented");
  }

  async save(_payment: Payment): Promise<void> {
    throw new Error("Not implemented");
  }
}
