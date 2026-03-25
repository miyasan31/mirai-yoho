"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
);

type PaymentMode = "setup" | "payment";
type PaymentMethodType = "card" | "paypay";

function CheckoutForm({
  bookingId,
  mode,
}: {
  bookingId: string;
  mode: PaymentMode;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(undefined);

    const returnUrl = `${window.location.origin}/booking/complete?bookingId=${bookingId}&mode=${mode}`;

    const result =
      mode === "setup"
        ? await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: returnUrl },
          })
        : await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: returnUrl },
          });

    if (result.error) {
      setErrorMessage(result.error.message);
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
        {mode === "setup" ? "カード情報を登録する" : "お支払いを確定する"}
      </Button>
    </form>
  );
}

function PaymentMethodSelector({ bookingId }: { bookingId: string }) {
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType>("card");
  const [clientSecret, setClientSecret] = useState<string>();
  const [mode, setMode] = useState<PaymentMode>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSetupPayment = async () => {
    setIsLoading(true);
    setErrorMessage(undefined);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/setup-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodType: selectedMethod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "決済のセットアップに失敗しました");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setMode(data.mode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "エラーが発生しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (clientSecret && mode) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret, locale: "ja" }}>
        <CheckoutForm bookingId={bookingId} mode={mode} />
      </Elements>
    );
  }

  return (
    <div
      className={css({ display: "flex", flexDirection: "column", gap: "6" })}
    >
      <Text fontWeight="medium">お支払い方法を選択してください</Text>

      <div
        className={css({ display: "flex", flexDirection: "column", gap: "3" })}
      >
        <label
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            p: "4",
            border: "1px solid",
            borderColor:
              selectedMethod === "card" ? "blue.500" : "border.default",
            borderRadius: "lg",
            cursor: "pointer",
            _hover: { borderColor: "blue.400" },
          })}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={selectedMethod === "card"}
            onChange={() => setSelectedMethod("card")}
          />
          <Text>クレジットカード</Text>
        </label>

        <label
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            p: "4",
            border: "1px solid",
            borderColor:
              selectedMethod === "paypay" ? "blue.500" : "border.default",
            borderRadius: "lg",
            cursor: "pointer",
            _hover: { borderColor: "blue.400" },
          })}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="paypay"
            checked={selectedMethod === "paypay"}
            onChange={() => setSelectedMethod("paypay")}
          />
          <Text>PayPay</Text>
        </label>
      </div>

      {selectedMethod === "card" && (
        <Text className={css({ fontSize: "sm", color: "fg.muted" })}>
          カード情報を登録します。お支払いは相談実施後に確定します。
        </Text>
      )}
      {selectedMethod === "paypay" && (
        <Text className={css({ fontSize: "sm", color: "fg.muted" })}>
          予約確定時にお支払いが完了します。
        </Text>
      )}

      {errorMessage && (
        <Text className={css({ color: "red.500", fontSize: "sm" })}>
          {errorMessage}
        </Text>
      )}

      <Button
        onClick={handleSetupPayment}
        loading={isLoading}
        loadingText="準備中..."
      >
        次へ進む
      </Button>
    </div>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  if (!bookingId) {
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

      <PaymentMethodSelector bookingId={bookingId} />
    </div>
  );
}
