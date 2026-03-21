export interface IStripeService {
  createPaymentIntent(params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }>;

  cancelPaymentIntent(paymentIntentId: string): Promise<void>;

  capturePaymentIntent(paymentIntentId: string): Promise<void>;
}
