import Stripe from "stripe";
import type { IStripeService } from "@/application/shared/stripe-service";
import { envServer } from "@/config/env.server";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(envServer.stripeSecretKey);
  }
  return stripeClient;
}

export class StripeService implements IStripeService {
  async createSetupIntent(params: {
    metadata: Record<string, string>;
  }): Promise<{ setupIntentId: string; clientSecret: string }> {
    const setupIntent = await getStripeClient().setupIntents.create({
      metadata: params.metadata,
      usage: "off_session",
    });

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret as string,
    };
  }

  async createPaymentIntent(params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; clientSecret: string }> {
    const paymentIntent = await getStripeClient().paymentIntents.create({
      amount: params.amountJPY,
      currency: "jpy",
      payment_method_types: ["paypay"],
      metadata: params.metadata,
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret as string,
    };
  }

  async createOffSessionPaymentIntent(params: {
    amountJPY: number;
    paymentMethodId: string;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string }> {
    const paymentIntent = await getStripeClient().paymentIntents.create({
      amount: params.amountJPY,
      currency: "jpy",
      payment_method: params.paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: params.metadata,
    });

    return { paymentIntentId: paymentIntent.id };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    await getStripeClient().paymentIntents.cancel(paymentIntentId);
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<void> {
    await getStripeClient().refunds.create({ payment_intent: paymentIntentId });
  }
}
