import Stripe from "stripe";
import { envServer } from "@/config/env.server";
import { createCompleteSetupUseCase } from "@/infrastructure/container";
import { FirestorePaymentRepository } from "@/infrastructure/firestore/firestore-payment-repository";
import { withNoStore } from "../cache-control";

let stripeCustomer: Stripe | null = null;

function getStripeCustomer(): Stripe {
  if (!stripeCustomer) {
    stripeCustomer = new Stripe(envServer.stripeSecretKey);
  }
  return stripeCustomer;
}

export async function POST(request: Request) {
  const webhookSecret = envServer.stripeWebhookSecret;
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return withNoStore(
      Response.json(
        {
          code: "MISSING_SIGNATURE",
          message: "Missing stripe-signature header",
        },
        { status: 400 },
      ),
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripeCustomer().webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
  } catch {
    return withNoStore(
      Response.json(
        { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" },
        { status: 400 },
      ),
    );
  }

  switch (event.type) {
    case "setup_intent.succeeded": {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      if (paymentMethodId) {
        const useCase = createCompleteSetupUseCase();
        await useCase.execute({
          setupIntentId: setupIntent.id,
          paymentMethodId,
        });
      }
      break;
    }

    case "setup_intent.setup_failed": {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const paymentRepo = new FirestorePaymentRepository();
      const payment = await paymentRepo.findBySetupIntentId(setupIntent.id);
      if (payment && payment.getStatus().getValue() === "setup_pending") {
        payment.cancel();
        await paymentRepo.save(payment);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentRepo = new FirestorePaymentRepository();
      const payment = await paymentRepo.findByPaymentIntentId(paymentIntent.id);
      if (payment) {
        const status = payment.getStatus().getValue();
        if (status === "setup_complete") {
          payment.failCharge();
          await paymentRepo.save(payment);
        }
      }
      break;
    }
  }

  return withNoStore(Response.json({ received: true }));
}
