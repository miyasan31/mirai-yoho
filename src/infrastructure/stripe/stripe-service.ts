import type { IStripeService } from "@/application/shared/iStripeService";

export class StripeService implements IStripeService {
  async createPaymentIntent(_params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }> {
    throw new Error("Not implemented");
  }

  async cancelPaymentIntent(_paymentIntentId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async capturePaymentIntent(_paymentIntentId: string): Promise<void> {
    throw new Error("Not implemented");
  }
}
