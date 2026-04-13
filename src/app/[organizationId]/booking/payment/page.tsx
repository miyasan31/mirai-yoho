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
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
);

type PaymentMode = "setup" | "payment";
type PaymentMethodType = "card" | "paypay";

function ErrorMessage({ message }: { message: string }) {
  return (
    <styled.div
      display="flex"
      alignItems="center"
      gap="2"
      p="3"
      bg="red.50"
      rounded="l2"
    >
      <CircleX
        size={16}
        color="var(--colors-red-500)"
        style={{ flexShrink: 0 }}
      />
      <Text textStyle="sm" color="red.700">
        {message}
      </Text>
    </styled.div>
  );
}

function CheckoutForm({
  bookingId,
  mode,
  organizationId,
}: {
  bookingId: string;
  mode: PaymentMode;
  organizationId: string;
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

    const returnUrl = `${window.location.origin}/${organizationId}/booking/complete?bookingId=${bookingId}&mode=${mode}`;

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
    <styled.form
      onSubmit={handleSubmit}
      display="flex"
      flexDirection="column"
      gap="6"
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
    </styled.form>
  );
}

function PaymentMethodSelector({
  bookingId,
  organizationId,
}: {
  bookingId: string;
  organizationId: string;
}) {
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
      const response = await fetch(
        `/api/organizations/${organizationId}/bookings/${bookingId}/setup-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodType: selectedMethod }),
        },
      );

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
        <CheckoutForm
          bookingId={bookingId}
          mode={mode}
          organizationId={organizationId}
        />
      </Elements>
    );
  }

  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      <Text fontWeight="medium">お支払い方法を選択してください</Text>

      <styled.div display="flex" flexDirection="column" gap="3">
        {(
          [
            {
              value: "card" as const,
              label: "クレジットカード",
              description:
                "カード情報を登録します。お支払いは相談実施後に確定します。",
            },
            {
              value: "paypay" as const,
              label: "PayPay",
              description: "予約確定時にお支払いが完了します。",
            },
          ] as const
        ).map((method) => (
          <styled.label
            key={method.value}
            display="flex"
            alignItems="flex-start"
            gap="3"
            p="4"
            shadow="xs"
            border="1px solid"
            borderColor={
              selectedMethod === method.value
                ? "colorPalette.default"
                : "border"
            }
            rounded="l2"
            cursor="pointer"
            transition="all"
            transitionDuration="normal"
            _hover={{ borderColor: "colorPalette.default", shadow: "sm" }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.value}
              checked={selectedMethod === method.value}
              onChange={() => setSelectedMethod(method.value)}
              style={{ marginTop: "4px" }}
            />
            <styled.div>
              <Text fontWeight="medium">{method.label}</Text>
              <Text textStyle="sm" color="fg.muted" mt="1">
                {method.description}
              </Text>
            </styled.div>
          </styled.label>
        ))}
      </styled.div>

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <Button
        onClick={handleSetupPayment}
        loading={isLoading}
        loadingText="準備中..."
      >
        次へ進む
      </Button>
    </styled.div>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const { organizationId } = useOrganizationRouting();
  const bookingId = searchParams.get("bookingId");

  if (!bookingId || !organizationId) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={FileQuestion}
          message="予約情報が見つかりません"
          hint="URLが正しいかご確認ください"
        />
      </styled.div>
    );
  }

  return (
    <styled.div maxW="lg" mx="auto" p="8">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
        お支払い
      </Text>
      <Text textStyle="sm" color="fg.muted" mb="6">
        お支払い方法を選択して決済を完了してください
      </Text>

      <styled.div
        shadow="sm"
        rounded="l2"
        border="1px solid"
        borderColor="border"
        p="6"
      >
        <PaymentMethodSelector
          bookingId={bookingId}
          organizationId={organizationId}
        />
      </styled.div>
    </styled.div>
  );
}
