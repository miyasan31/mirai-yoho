import { valibotResolver } from "@hookform/resolvers/valibot";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { RadioGroup } from "@mirai-yoho/ui/components/ui";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { envClient } from "@/config/env.client";
import { useSetupPayment } from "@/hooks/use-booking";
import { pageHead } from "@/lib/head";
import {
  type CheckoutFormValues,
  checkoutFormSchema,
} from "./-checkout-form-schema";

const stripePromise = loadStripe(envClient.stripePublishableKey);

type PaymentMode = "setup" | "payment";
type PaymentMethodType = "card" | "paypay";

interface PaymentSearch {
  bookingId?: string;
  bookingActionToken?: string;
}

export const Route = createFileRoute("/$organizationId/booking/payment/")({
  head: () => pageHead("お支払い"),
  validateSearch: (search: Record<string, unknown>): PaymentSearch => ({
    bookingId:
      typeof search.bookingId === "string" ? search.bookingId : undefined,
    bookingActionToken:
      typeof search.bookingActionToken === "string"
        ? search.bookingActionToken
        : undefined,
  }),
  component: PaymentPage,
});

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
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: valibotResolver(checkoutFormSchema),
  });

  const onSubmit = async () => {
    if (!stripe || !elements) return;

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
      toaster.create({
        type: "error",
        title: result.error.message ?? "決済処理に失敗しました",
      });
    }
  };

  return (
    <styled.form
      onSubmit={handleSubmit(onSubmit)}
      display="flex"
      flexDirection="column"
      gap="6"
    >
      <PaymentElement />

      <Button
        type="submit"
        disabled={!stripe || isSubmitting}
        loading={isSubmitting}
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
  bookingActionToken,
}: {
  bookingId: string;
  organizationId: string;
  bookingActionToken: string;
}) {
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType>("card");
  const [clientSecret, setClientSecret] = useState<string>();
  const [mode, setMode] = useState<PaymentMode>();

  const setupPayment = useSetupPayment();

  const handleSetupPayment = () => {
    // エラーは custom-fetch の toaster で表示される
    setupPayment.mutate(
      {
        organizationId,
        bookingId,
        data: {
          paymentMethodType: selectedMethod,
          bookingActionToken,
        },
      },
      {
        onSuccess: (result) => {
          setClientSecret(result.data.customerSecret);
          setMode(result.data.mode);
        },
      },
    );
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

      <RadioGroup.Root
        name="paymentMethod"
        onValueChange={(details) =>
          setSelectedMethod(details.value as PaymentMethodType)
        }
        value={selectedMethod}
      >
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
          <RadioGroup.Item key={method.value} value={method.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl>
              <RadioGroup.Indicator />
            </RadioGroup.ItemControl>
            <RadioGroup.ItemText asChild>
              <styled.div>
                <Text fontWeight="medium">{method.label}</Text>
                <Text textStyle="sm" color="fg.muted" mt="1">
                  {method.description}
                </Text>
              </styled.div>
            </RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      <Button
        onClick={handleSetupPayment}
        loading={setupPayment.isPending}
        loadingText="準備中..."
      >
        次へ進む
      </Button>
    </styled.div>
  );
}

function PaymentPage() {
  const { bookingId, bookingActionToken } = Route.useSearch();
  const { organizationId } = Route.useParams();

  if (!bookingId || !organizationId || !bookingActionToken) {
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
          bookingActionToken={bookingActionToken}
        />
      </styled.div>
    </styled.div>
  );
}
