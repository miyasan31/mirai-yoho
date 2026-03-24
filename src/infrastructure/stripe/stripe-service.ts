import type { IStripeService } from "@/application/shared/stripe-service";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export class StripeService implements IStripeService {
  async createPaymentIntent(params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amountJPY,
      currency: "jpy",
      capture_method: "manual",
      metadata: params.metadata,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret as string,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    await stripe.paymentIntents.cancel(paymentIntentId);
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<void> {
    await stripe.paymentIntents.capture(paymentIntentId);
  }
}
