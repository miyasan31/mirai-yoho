import { describe, expect, it } from "vitest";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import { DomainError } from "@/domain/shared/domain-error";

function createAuthorizedPayment() {
  return Payment.create({
    paymentId: "pay-1",
    bookingId: "booking-1",
    clientId: "client-1",
    stripePaymentIntentId: "pi_test_123",
    money: Money.create(10000, 0.1),
  });
}

describe("Payment", () => {
  describe("create", () => {
    it("ステータスが authorized で作成される", () => {
      const payment = createAuthorizedPayment();
      expect(payment.getStatus().getValue()).toBe("authorized");
    });

    it("captureMethod は undefined", () => {
      const payment = createAuthorizedPayment();
      expect(payment.getCaptureMethod()).toBeUndefined();
    });
  });

  describe("capture", () => {
    it("authorized から captured に遷移する（manual）", () => {
      const payment = createAuthorizedPayment();
      payment.capture("manual");
      expect(payment.getStatus().getValue()).toBe("captured");
      expect(payment.getCaptureMethod()).toBe("manual");
    });

    it("authorized から captured に遷移する（batch）", () => {
      const payment = createAuthorizedPayment();
      payment.capture("batch");
      expect(payment.getStatus().getValue()).toBe("captured");
      expect(payment.getCaptureMethod()).toBe("batch");
    });

    it("PaymentCapturedEvent が発行される", () => {
      const payment = createAuthorizedPayment();
      payment.capture("manual");
      const events = payment.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe("PaymentCaptured");
    });

    it("authorized 以外から capture すると DomainError", () => {
      const payment = createAuthorizedPayment();
      payment.capture("manual");
      expect(() => payment.capture("manual")).toThrow(DomainError);
    });
  });

  describe("cancel", () => {
    it("authorized から cancelled に遷移する", () => {
      const payment = createAuthorizedPayment();
      payment.cancel();
      expect(payment.getStatus().getValue()).toBe("cancelled");
    });

    it("authorized 以外から cancel すると DomainError", () => {
      const payment = createAuthorizedPayment();
      payment.cancel();
      expect(() => payment.cancel()).toThrow(DomainError);
    });

    it("captured から cancel すると DomainError", () => {
      const payment = createAuthorizedPayment();
      payment.capture("manual");
      expect(() => payment.cancel()).toThrow(DomainError);
    });
  });
});
