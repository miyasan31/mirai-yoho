import { evaluateChargeEligibility } from "@/application/booking/charge-eligibility";
import { AppError } from "@/application/shared/app-error";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { ChargeMethod, Payment } from "@/domain/payment/payment";
import type { PaymentChargedEvent } from "@/domain/payment/payment-events";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface ChargePaymentInput {
  organizationId: string;
  bookingId: string;
  method: ChargeMethod;
  preloaded?: {
    booking: Booking;
    payment: Payment | null;
    customer: Customer;
  };
}

export class ChargePaymentUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly stripeService: IStripeService,
    private readonly emailService: IEmailService,
  ) {}

  async execute(input: ChargePaymentInput): Promise<void> {
    const { booking, payment, customer } = input.preloaded
      ? input.preloaded
      : await this.loadResources(input.organizationId, input.bookingId);

    const chargeEligibility = evaluateChargeEligibility({ booking, payment });
    if (!chargeEligibility.chargeable) {
      const statusCode =
        chargeEligibility.code === "PAYMENT_NOT_FOUND" ? 404 : 400;
      throw new AppError(
        statusCode,
        chargeEligibility.code ?? "PAYMENT_NOT_CHARGEABLE",
        chargeEligibility.reason ?? "Payment is not chargeable",
      );
    }
    if (!payment) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "決済情報が見つかりません");
    }

    const paymentMethodId = payment.getStripePaymentMethodId();
    if (!paymentMethodId) {
      throw new AppError(
        400,
        "PAYMENT_SETUP_INCOMPLETE",
        "カード情報の登録が完了していないため課金できません",
      );
    }

    try {
      const { paymentIntentId } =
        await this.stripeService.createOffSessionPaymentIntent({
          amountJPY: payment.getMoney().getTotalJPY(),
          paymentMethodId,
          metadata: { bookingId: input.bookingId },
        });

      payment.charge(paymentIntentId, input.method);
      booking.complete();

      await Promise.all([
        this.bookingRepository.save(booking),
        this.paymentRepository.save(payment),
      ]);

      const events = payment.pullDomainEvents();
      for (const event of events) {
        if (event.eventName === "PaymentCharged") {
          const e = event as PaymentChargedEvent;
          await this.emailService.sendPaymentReceipt({
            customerEmail: customer.getEmail(),
            customerName: customer.getName(),
            amountJPY: e.payload.amountJPY,
            bookingId: e.payload.bookingId,
          });
        }
      }
    } catch (error) {
      payment.failCharge();
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  private async loadResources(
    organizationId: string,
    bookingId: string,
  ): Promise<{
    booking: Booking;
    payment: Payment | null;
    customer: Customer;
  }> {
    const [booking, payment] = await Promise.all([
      this.bookingRepository.findById(organizationId, bookingId),
      this.paymentRepository.findByBookingId(organizationId, bookingId),
    ]);
    if (!booking) {
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    const customer = await this.customerRepository.findById(
      organizationId,
      booking.getCustomerId(),
    );
    if (!customer) {
      throw new AppError(404, "CLIENT_NOT_FOUND", "Customer not found");
    }
    return { booking, payment, customer };
  }
}
