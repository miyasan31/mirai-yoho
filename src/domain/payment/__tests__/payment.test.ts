import { describe, expect, it } from "vitest";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import { DomainError } from "@/domain/shared/domain-error";

function createDeferredPayment() {
  return Payment.createDeferred({
    paymentId: "pay-1",
    bookingId: "booking-1",
    clientId: "client-1",
    stripeSetupIntentId: "si_test_123",
    money: Money.create(10000, 0.1),
  });
}

function createSetupCompletePayment() {
  const payment = createDeferredPayment();
  payment.completeSetup("pm_test_123");
  return payment;
}

describe("Payment", () => {
  describe("createDeferred", () => {
    it("ステータスが setup_pending で作成される", () => {
      const payment = createDeferredPayment();
      expect(payment.getStatus().getValue()).toBe("setup_pending");
    });

    it("chargeMethod は undefined", () => {
      const payment = createDeferredPayment();
      expect(payment.getChargeMethod()).toBeUndefined();
    });
  });

  describe("createImmediate", () => {
    it("ステータスが charged で作成される", () => {
      const payment = Payment.createImmediate({
        paymentId: "pay-2",
        bookingId: "booking-2",
        clientId: "client-2",
        stripePaymentIntentId: "pi_test_123",
        money: Money.create(10000, 0.1),
      });
      expect(payment.getStatus().getValue()).toBe("charged");
    });
  });

  describe("completeSetup", () => {
    it("setup_pending から setup_complete に遷移する", () => {
      const payment = createDeferredPayment();
      payment.completeSetup("pm_test_123");
      expect(payment.getStatus().getValue()).toBe("setup_complete");
    });

    it("setup_pending 以外から completeSetup すると DomainError", () => {
      const payment = createSetupCompletePayment();
      expect(() => payment.completeSetup("pm_test_456")).toThrow(DomainError);
    });
  });

  describe("charge", () => {
    it("setup_complete から charged に遷移する（manual）", () => {
      const payment = createSetupCompletePayment();
      payment.charge("pi_test_123", "manual");
      expect(payment.getStatus().getValue()).toBe("charged");
      expect(payment.getChargeMethod()).toBe("manual");
    });

    it("setup_complete から charged に遷移する（batch）", () => {
      const payment = createSetupCompletePayment();
      payment.charge("pi_test_123", "batch");
      expect(payment.getStatus().getValue()).toBe("charged");
      expect(payment.getChargeMethod()).toBe("batch");
    });

    it("PaymentChargedEvent が発行される", () => {
      const payment = createSetupCompletePayment();
      payment.charge("pi_test_123", "manual");
      const events = payment.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe("PaymentCharged");
    });

    it("setup_complete 以外から charge すると DomainError", () => {
      const payment = createDeferredPayment();
      expect(() => payment.charge("pi_test_123", "manual")).toThrow(
        DomainError,
      );
    });
  });

  describe("cancel", () => {
    it("setup_pending から cancelled に遷移する", () => {
      const payment = createDeferredPayment();
      payment.cancel();
      expect(payment.getStatus().getValue()).toBe("cancelled");
    });

    it("setup_complete から cancelled に遷移する", () => {
      const payment = createSetupCompletePayment();
      payment.cancel();
      expect(payment.getStatus().getValue()).toBe("cancelled");
    });

    it("cancelled から cancel すると DomainError", () => {
      const payment = createDeferredPayment();
      payment.cancel();
      expect(() => payment.cancel()).toThrow(DomainError);
    });

    it("charged から cancel すると DomainError", () => {
      const payment = createSetupCompletePayment();
      payment.charge("pi_test_123", "manual");
      expect(() => payment.cancel()).toThrow(DomainError);
    });
  });
});
