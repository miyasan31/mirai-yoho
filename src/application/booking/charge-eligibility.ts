import type { Booking } from "@/domain/booking/booking";
import type { Payment } from "@/domain/payment/payment";

export type ChargeDisabledReasonCode =
  | "BOOKING_NOT_CONFIRMED"
  | "BOOKING_NOT_CHARGEABLE_YET"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_SETUP_INCOMPLETE"
  | "PAYMENT_ALREADY_PROCESSED";

const CHARGE_DISABLED_REASON_MESSAGES: Record<
  ChargeDisabledReasonCode,
  string
> = {
  BOOKING_NOT_CONFIRMED: "予約が確定状態ではないため課金できません",
  BOOKING_NOT_CHARGEABLE_YET: "予約開始前のため課金できません",
  PAYMENT_NOT_FOUND: "決済情報が見つかりません",
  PAYMENT_SETUP_INCOMPLETE:
    "カード情報の登録が完了していないため課金できません",
  PAYMENT_ALREADY_PROCESSED: "すでに課金処理済みのため課金できません",
};

export interface ChargeEligibility {
  chargeable: boolean;
  code: ChargeDisabledReasonCode | null;
  reason: string | null;
}

function createIneligibleReason(
  code: ChargeDisabledReasonCode,
): ChargeEligibility {
  return {
    chargeable: false,
    code,
    reason: CHARGE_DISABLED_REASON_MESSAGES[code],
  };
}

export function evaluateChargeEligibility(params: {
  booking: Booking;
  payment: Payment | null;
  now?: Date;
}): ChargeEligibility {
  const { booking, payment, now = new Date() } = params;

  if (booking.getStatus().getValue() !== "confirmed") {
    return createIneligibleReason("BOOKING_NOT_CONFIRMED");
  }

  if (booking.getStartDatetime() > now) {
    return createIneligibleReason("BOOKING_NOT_CHARGEABLE_YET");
  }

  if (!payment) {
    return createIneligibleReason("PAYMENT_NOT_FOUND");
  }

  const status = payment.getStatus().getValue();
  if (status === "charged" || status === "refunded" || status === "cancelled") {
    return createIneligibleReason("PAYMENT_ALREADY_PROCESSED");
  }

  if (!payment.getPaymentStrategy().isDeferred()) {
    return createIneligibleReason("PAYMENT_ALREADY_PROCESSED");
  }

  if (status !== "setup_complete") {
    return createIneligibleReason("PAYMENT_SETUP_INCOMPLETE");
  }

  if (!payment.getStripePaymentMethodId()) {
    return createIneligibleReason("PAYMENT_SETUP_INCOMPLETE");
  }

  return {
    chargeable: true,
    code: null,
    reason: null,
  };
}
