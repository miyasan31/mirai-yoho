import { ChargePaymentUseCase } from "@/application/booking/charge-payment-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

const ORGANIZATION_ID = "org-1";
const BOOKING_ID = "booking-1";
const CLIENT_ID = "customer-1";

class InMemoryBookingRepository implements IBookingRepository {
  constructor(public readonly booking: Booking | null) {}

  async findById(
    _organizationId: string,
    _bookingId: string,
  ): Promise<Booking | null> {
    return this.booking;
  }

  async findByConsultantId(
    _organizationId: string,
    _consultantId: string,
  ): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findByCustomerId(
    _organizationId: string,
    _customerId: string,
  ): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findAllByCustomerId(_customerId: string): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findAllByCustomerIds(_customerIds: string[]): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findByStatus(
    _organizationId: string,
    _status: string,
  ): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findConsultationReminderTargets(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findAll(_organizationId: string): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async save(_booking: Booking): Promise<void> {}
  async saveInTx(_booking: Booking): Promise<void> {}
}

class InMemoryPaymentRepository implements IPaymentRepository {
  constructor(public readonly payment: Payment | null) {}

  async findByBookingId(
    _organizationId: string,
    _bookingId: string,
  ): Promise<Payment | null> {
    return this.payment;
  }

  async findByBookingIds(
    _organizationId: string,
    _bookingIds: string[],
  ): Promise<Payment[]> {
    return this.payment ? [this.payment] : [];
  }

  async findByPaymentIntentId(
    _paymentIntentId: string,
  ): Promise<Payment | null> {
    return null;
  }

  async findBySetupIntentId(_setupIntentId: string): Promise<Payment | null> {
    return null;
  }

  async findAll(_organizationId: string): Promise<Payment[]> {
    return this.payment ? [this.payment] : [];
  }

  async save(_payment: Payment): Promise<void> {}
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customer: Customer | null) {}

  async findById(
    _organizationId: string,
    _customerId: string,
  ): Promise<Customer | null> {
    return this.customer;
  }

  async findByEmail(
    _organizationId: string,
    _email: string,
  ): Promise<Customer | null> {
    return this.customer;
  }

  async findAll(_organizationId: string): Promise<Customer[]> {
    return this.customer ? [this.customer] : [];
  }

  async findByIds(
    _organizationId: string,
    _customerIds: string[],
  ): Promise<Customer[]> {
    return this.customer ? [this.customer] : [];
  }

  async findByEmailAcrossOrganizations(_email: string): Promise<Customer[]> {
    return this.customer ? [this.customer] : [];
  }

  async findByUserId(_userId: string): Promise<Customer[]> {
    return this.customer ? [this.customer] : [];
  }

  async findByUserIdAndOrganizationId(
    _userId: string,
    _organizationId: string,
  ): Promise<Customer | null> {
    return this.customer;
  }

  async save(_customer: Customer): Promise<void> {}
}

function createConfirmedBooking(startsAt: string): Booking {
  const booking = Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: BOOKING_ID,
    customerId: CLIENT_ID,
    consultantId: "consultant-1",
    usageSlotIds: ["slot-1", "slot-2"],
    bufferSlotIds: ["slot-3"],
    startsAt: new Date(startsAt),
    endsAt: new Date(new Date(startsAt).getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.create({
      customerName: "",
      birthDate: "",
      appraisalDate: "",
      freeMemo: "memo",
    }),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
    agreedTermsVersion: "2026-08-01",
    agreedCancellationPolicyVersion: "2026-08-01",
    agreedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
  booking.confirm(ZoomUrl.create("https://zoom.us/j/test"));
  return booking;
}

function createDeferredPayment(): Payment {
  return Payment.createDeferred({
    organizationId: ORGANIZATION_ID,
    paymentId: "payment-1",
    bookingId: BOOKING_ID,
    customerId: CLIENT_ID,
    stripeSetupIntentId: "si_123",
    money: Money.create(5000, 0.1),
  });
}

function createCustomer(): Customer {
  return Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId: CLIENT_ID,
    name: "山田 太郎",
    email: "taro@example.com",
    phone: "09012345678",
    birthDate: "1990-01-01",
  });
}

function createUseCase(input: {
  booking: Booking;
  payment: Payment;
  stripeService?: IStripeService;
  emailService?: IEmailService;
}) {
  const stripeService: IStripeService =
    input.stripeService ??
    ({
      createSetupIntent: vi.fn(),
      createPaymentIntent: vi.fn(),
      createOffSessionPaymentIntent: vi
        .fn()
        .mockResolvedValue({ paymentIntentId: "pi_123" }),
      cancelPaymentIntent: vi.fn(),
      refundPaymentIntent: vi.fn(),
    } satisfies IStripeService);
  const emailService: IEmailService =
    input.emailService ??
    ({
      sendBookingConfirmation: vi.fn(),
      sendBookingCancellation: vi.fn(),
      sendPaymentReceipt: vi.fn().mockResolvedValue(undefined),
      sendConsultationReminder: vi.fn(),
      sendConsultantBookingNotice: vi.fn(),
      sendConsultantCancellationNotice: vi.fn(),
      sendBatchChargeReport: vi.fn(),
      sendInvitation: vi.fn(),
      sendPasswordReset: vi.fn(),
    } satisfies IEmailService);

  return {
    useCase: new ChargePaymentUseCase(
      new InMemoryBookingRepository(input.booking),
      new InMemoryPaymentRepository(input.payment),
      new InMemoryCustomerRepository(createCustomer()),
      stripeService,
      emailService,
    ),
    stripeService,
    emailService,
  };
}

describe("ChargePaymentUseCase", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("throws BOOKING_NOT_CHARGEABLE_YET when booking start is in the future", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T01:32:00.000Z"));

    const booking = createConfirmedBooking("2026-04-21T01:30:00.000Z");
    const payment = createDeferredPayment();
    payment.completeSetup("pm_123");
    const { useCase, stripeService } = createUseCase({ booking, payment });

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        method: "manual",
      }),
    ).rejects.toMatchObject({
      code: "BOOKING_NOT_CHARGEABLE_YET",
      statusCode: 400,
    });
    expect(stripeService.createOffSessionPaymentIntent).not.toHaveBeenCalled();
  });

  it("throws PAYMENT_SETUP_INCOMPLETE when setup is not complete", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T01:32:00.000Z"));

    const booking = createConfirmedBooking("2026-04-21T01:30:00.000Z");
    const payment = createDeferredPayment();
    const { useCase, stripeService } = createUseCase({ booking, payment });

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        method: "manual",
      }),
    ).rejects.toMatchObject({
      code: "PAYMENT_SETUP_INCOMPLETE",
      statusCode: 400,
    });
    expect(stripeService.createOffSessionPaymentIntent).not.toHaveBeenCalled();
  });

  it("charges successfully and updates booking/payment state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T01:32:00.000Z"));

    const booking = createConfirmedBooking("2026-04-21T01:30:00.000Z");
    const payment = createDeferredPayment();
    payment.completeSetup("pm_123");
    const { useCase, stripeService, emailService } = createUseCase({
      booking,
      payment,
    });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      method: "manual",
    });

    expect(stripeService.createOffSessionPaymentIntent).toHaveBeenCalledWith({
      amountJPY: payment.getMoney().getTotalJPY(),
      paymentMethodId: "pm_123",
      metadata: { bookingId: BOOKING_ID },
    });
    expect(payment.getStatus().getValue()).toBe("charged");
    expect(payment.getChargeMethod()).toBe("manual");
    expect(booking.getStatus().getValue()).toBe("completed");
    expect(emailService.sendPaymentReceipt).toHaveBeenCalledTimes(1);
  });
});
