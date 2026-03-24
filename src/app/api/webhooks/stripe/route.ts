import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createBookingRepository } from "@/infrastructure/container";
import { FirestorePaymentRepository } from "@/infrastructure/firestore/firestore-payment-repository";
import { PaymentStatus } from "@/domain/payment/payment-status";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { code: "MISSING_SIGNATURE", message: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json(
      { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.bookingId;
      if (bookingId) {
        const paymentRepo = new FirestorePaymentRepository();
        const payment = await paymentRepo.findByBookingId(bookingId);
        if (payment && payment.getStatus().getValue() === "authorized") {
          payment.cancel();
          await paymentRepo.save(payment);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
