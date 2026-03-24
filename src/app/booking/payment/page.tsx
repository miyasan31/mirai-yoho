"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
);

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(undefined);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/complete?bookingId=${bookingId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={css({ display: "flex", flexDirection: "column", gap: "6" })}
    >
      <PaymentElement />

      {errorMessage && (
        <Text className={css({ color: "red.500", fontSize: "sm" })}>
          {errorMessage}
        </Text>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        loading={isProcessing}
        loadingText="処理中..."
      >
        お支払いを確定する
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const clientSecret = searchParams.get("clientSecret");

  if (!bookingId || !clientSecret) {
    return (
      <div className={css({ p: "8" })}>
        <Text className={css({ color: "red.500" })}>
          予約情報が見つかりません
        </Text>
      </div>
    );
  }

  return (
    <div className={css({ maxW: "lg", mx: "auto", p: "8" })}>
      <Text
        as="h1"
        className={css({ fontSize: "3xl", fontWeight: "bold", mb: "8" })}
      >
        お支払い
      </Text>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: "ja",
        }}
      >
        <CheckoutForm bookingId={bookingId} />
      </Elements>
    </div>
  );
}
