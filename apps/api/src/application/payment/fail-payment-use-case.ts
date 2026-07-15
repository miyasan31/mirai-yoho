import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface FailPaymentInput {
  paymentIntentId: string;
}

export class FailPaymentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: FailPaymentInput): Promise<void> {
    const payment = await this.paymentRepository.findByPaymentIntentId(
      input.paymentIntentId,
    );
    if (!payment) return;
    if (payment.getStatus().getValue() !== "setup_complete") return;

    payment.failCharge();
    await this.paymentRepository.save(payment);
  }
}
