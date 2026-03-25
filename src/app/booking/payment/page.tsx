"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CircleX, FileQuestion } from "lucide-react";
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "2",
        p: "3",
        bg: "red.50",
        rounded: "l2",
      })}
    >
      <CircleX size={16} className={css({ color: "red.500", flexShrink: 0 })} />
      <Text textStyle="sm" color="red.700">
        {message}
      </Text>
    </div>
  );
}

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

      {errorMessage && <ErrorMessage message={errorMessage} />}

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
            shadow: "xs",
            border: "1px solid",
            borderColor:
              selectedMethod === "card" ? "blue.500" : "border.default",
            rounded: "l2",
            cursor: "pointer",
            transition: "all",
            transitionDuration: "normal",
            _hover: { borderColor: "blue.400", shadow: "sm" },
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
            shadow: "xs",
            border: "1px solid",
            borderColor:
              selectedMethod === "paypay" ? "blue.500" : "border.default",
            rounded: "l2",
            cursor: "pointer",
            transition: "all",
            transitionDuration: "normal",
            _hover: { borderColor: "blue.400", shadow: "sm" },
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
        <Text textStyle="sm" color="fg.muted">
          カード情報を登録します。お支払いは相談実施後に確定します。
        </Text>
      )}
      {selectedMethod === "paypay" && (
        <Text textStyle="sm" color="fg.muted">
          予約確定時にお支払いが完了します。
        </Text>
      )}

      {errorMessage && <ErrorMessage message={errorMessage} />}

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
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          alignItems: "center",
          gap: "3",
          py: "16",
          px: "8",
        })}
      >
        <FileQuestion size={48} className={css({ color: "fg.subtle" })} />
        <Text fontWeight="medium" color="fg.muted">
          予約情報が見つかりません
        </Text>
        <Text textStyle="sm" color="fg.subtle">
          URLが正しいかご確認ください
        </Text>
      </div>
    );
  }

  return (
    <div className={css({ maxW: "lg", mx: "auto", p: "8" })}>
      <div className={css({ mb: "8" })}>
        <Text
          as="h1"
          className={css({ textStyle: "2xl", fontWeight: "bold", mb: "1" })}
        >
          お支払い
        </Text>
        <Text textStyle="sm" color="fg.muted">
          お支払い方法を選択して決済を完了してください
        </Text>
      </div>

      <PaymentMethodSelector bookingId={bookingId} />
    </div>
  );
}
