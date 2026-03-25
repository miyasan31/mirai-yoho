import type { IStripeService } from "@/application/shared/stripe-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

const AMOUNT_JPY = 5000;
const TAX_RATE = 0.1;

interface SetupPaymentInput {
  bookingId: string;
  paymentMethodType: "card" | "paypay";
}

interface SetupPaymentOutput {
  clientSecret: string;
  mode: "setup" | "payment";
}

export class SetupPaymentUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly stripeService: IStripeService,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: SetupPaymentInput): Promise<SetupPaymentOutput> {
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const existingPayment = await this.paymentRepository.findByBookingId(
      input.bookingId,
    );
    if (existingPayment) {
      throw new Error("Payment already exists for this booking");
    }

    const money = Money.create(AMOUNT_JPY, TAX_RATE);

    if (input.paymentMethodType === "card") {
      const { setupIntentId, clientSecret } =
        await this.stripeService.createSetupIntent({
          metadata: { bookingId: input.bookingId },
        });

      const payment = Payment.createDeferred({
        paymentId: crypto.randomUUID(),
        bookingId: input.bookingId,
        clientId: booking.getClientId(),
        stripeSetupIntentId: setupIntentId,
        money,
      });

      await this.unitOfWork.runInTransaction(async () => {
        await this.paymentRepository.save(payment);
      });

      return { clientSecret, mode: "setup" };
    }

    const { paymentIntentId, clientSecret } =
      await this.stripeService.createPaymentIntent({
        amountJPY: money.getTotalJPY(),
        metadata: { bookingId: input.bookingId },
      });

    const payment = Payment.createImmediate({
      paymentId: crypto.randomUUID(),
      bookingId: input.bookingId,
      clientId: booking.getClientId(),
      stripePaymentIntentId: paymentIntentId,
      money,
    });

    await this.unitOfWork.runInTransaction(async () => {
      await this.paymentRepository.save(payment);
    });

    return { clientSecret, mode: "payment" };
  }
}
