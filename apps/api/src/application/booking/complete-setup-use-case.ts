import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface CompleteSetupInput {
  setupIntentId: string;
  paymentMethodId: string;
}

export class CompleteSetupUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: CompleteSetupInput): Promise<void> {
    const payment = await this.paymentRepository.findBySetupIntentId(
      input.setupIntentId,
    );
    if (!payment) {
      throw new Error("Payment not found for setup intent");
    }

    payment.completeSetup(input.paymentMethodId);
    await this.paymentRepository.save(payment);
  }
}
