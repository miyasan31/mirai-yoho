import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface CancelPaymentInput {
  setupIntentId: string;
}

export class CancelPaymentUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: CancelPaymentInput): Promise<void> {
    const payment = await this.paymentRepository.findBySetupIntentId(
      input.setupIntentId,
    );
    if (!payment) return;
    if (payment.getStatus().getValue() !== "setup_pending") return;

    payment.cancel();
    await this.paymentRepository.save(payment);
  }
}
