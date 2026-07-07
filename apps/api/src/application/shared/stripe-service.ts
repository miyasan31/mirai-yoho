export interface IStripeService {
  createSetupIntent(params: {
    metadata: Record<string, string>;
  }): Promise<{ setupIntentId: string; customerSecret: string }>;

  createPaymentIntent(params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; customerSecret: string }>;

  createOffSessionPaymentIntent(params: {
    amountJPY: number;
    paymentMethodId: string;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string }>;

  cancelPaymentIntent(paymentIntentId: string): Promise<void>;

  refundPaymentIntent(paymentIntentId: string): Promise<void>;
}
