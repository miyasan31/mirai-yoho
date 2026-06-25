import Stripe from "stripe";
import type { IStripeService } from "@/application/shared/stripe-service";
import { envServer } from "@/config/env.server";

let stripeCustomer: Stripe | null = null;

function getStripeCustomer(): Stripe {
  if (!stripeCustomer) {
    stripeCustomer = new Stripe(envServer.stripeSecretKey);
  }
  return stripeCustomer;
}

export class StripeService implements IStripeService {
  async createSetupIntent(params: {
    metadata: Record<string, string>;
  }): Promise<{ setupIntentId: string; customerSecret: string }> {
    const setupIntent = await getStripeCustomer().setupIntents.create({
      metadata: params.metadata,
      usage: "off_session",
    });

    return {
      setupIntentId: setupIntent.id,
      customerSecret: setupIntent.client_secret as string,
    };
  }

  async createPaymentIntent(params: {
    amountJPY: number;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string; customerSecret: string }> {
    const paymentIntent = await getStripeCustomer().paymentIntents.create({
      amount: params.amountJPY,
      currency: "jpy",
      payment_method_types: ["paypay"],
      metadata: params.metadata,
    });

    return {
      paymentIntentId: paymentIntent.id,
      customerSecret: paymentIntent.client_secret as string,
    };
  }

  async createOffSessionPaymentIntent(params: {
    amountJPY: number;
    paymentMethodId: string;
    metadata: Record<string, string>;
  }): Promise<{ paymentIntentId: string }> {
    const paymentIntent = await getStripeCustomer().paymentIntents.create({
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
    await getStripeCustomer().paymentIntents.cancel(paymentIntentId);
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<void> {
    await getStripeCustomer().refunds.create({
      payment_intent: paymentIntentId,
    });
  }
}
