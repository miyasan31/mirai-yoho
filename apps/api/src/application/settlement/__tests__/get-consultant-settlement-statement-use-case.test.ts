import { GetConsultantSettlementStatementUseCase } from "@/application/settlement/get-consultant-settlement-statement-use-case";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { Money } from "@/domain/payment/money";
import { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import { PaymentStatus } from "@/domain/payment/payment-status";
import { PaymentStrategy } from "@/domain/payment/payment-strategy";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";

const ORGANIZATION_ID = "org-1";
const CONSULTANT_ID = "consultant-1";
const CUSTOMER_ID = "customer-1";
const MONTH = "2026-07";

/** 2026-07-15 12:00 JST */
const IN_PERIOD_STARTS_AT = new Date("2026-07-15T03:00:00.000Z");
/** 2026-08-01 00:00 JST（対象月の外） */
const OUT_OF_PERIOD_STARTS_AT = new Date("2026-07-31T15:00:00.000Z");

function createBooking(bookingId: string, startsAt: Date): Booking {
  return Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId,
    customerId: CUSTOMER_ID,
    consultantId: CONSULTANT_ID,
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "30分プラン",
    pricePlanTotalJPY: 11000,
    agreedTermsVersion: "1.0.0",
    agreedCancellationPolicyVersion: "1.0.0",
    agreedAt: new Date(),
  });
}

function createPayment(
  bookingId: string,
  totalJPY: number,
  status: string,
): Payment {
  return Payment.reconstruct({
    organizationId: ORGANIZATION_ID,
    paymentId: `payment-${bookingId}`,
    bookingId,
    customerId: CUSTOMER_ID,
    money: Money.fromTaxIncluded(totalJPY, 0.1),
    status: PaymentStatus.reconstruct(status),
    paymentStrategy: PaymentStrategy.reconstruct("deferred"),
  });
}

class InMemoryBookingRepository implements IBookingRepository {
  constructor(private readonly bookings: Booking[]) {}

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getConsultantId() === consultantId,
    );
  }

  async findById(): Promise<Booking | null> {
    return null;
  }
  async findByCustomerId(): Promise<Booking[]> {
    return [];
  }
  async findAllByCustomerId(): Promise<Booking[]> {
    return [];
  }
  async findAllByCustomerIds(): Promise<Booking[]> {
    return [];
  }
  async findByStatus(): Promise<Booking[]> {
    return [];
  }
  async findConsultationReminderTargets(): Promise<Booking[]> {
    return [];
  }
  async findAll(): Promise<Booking[]> {
    return this.bookings;
  }
  async save(): Promise<void> {}
  async saveInTx(): Promise<void> {}
}

class InMemoryPaymentRepository implements IPaymentRepository {
  constructor(private readonly payments: Payment[]) {}

  async findByBookingIds(
    _organizationId: string,
    bookingIds: string[],
  ): Promise<Payment[]> {
    return this.payments.filter((payment) =>
      bookingIds.includes(payment.getBookingId()),
    );
  }

  async findByBookingId(): Promise<Payment | null> {
    return null;
  }
  async findByPaymentIntentId(): Promise<Payment | null> {
    return null;
  }
  async findBySetupIntentId(): Promise<Payment | null> {
    return null;
  }
  async findAll(): Promise<Payment[]> {
    return this.payments;
  }
  async save(): Promise<void> {}
}

class InMemoryConsultantRepository implements IConsultantRepository {
  constructor(private readonly consultant: Consultant | null) {}

  async findById(): Promise<Consultant | null> {
    return this.consultant;
  }
  async findByIds(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async findAll(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async findAllActive(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async findOrganizationIdsByConsultantId(): Promise<string[]> {
    return [ORGANIZATION_ID];
  }
  async findByConsultantId(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

class InMemorySettingsRepository implements ISettingsRepository {
  constructor(private readonly settings: Settings | null) {}

  async findByOrganizationId(): Promise<Settings | null> {
    return this.settings;
  }
  async save(): Promise<void> {}
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customers: Customer[]) {}

  async findByIds(
    _organizationId: string,
    customerIds: string[],
  ): Promise<Customer[]> {
    return this.customers.filter((customer) =>
      customerIds.includes(customer.getCustomerId()),
    );
  }

  async findById(): Promise<Customer | null> {
    return null;
  }
  async findByEmail(): Promise<Customer | null> {
    return null;
  }
  async findByEmailAcrossOrganizations(): Promise<Customer[]> {
    return [];
  }
  async findByUserId(): Promise<Customer[]> {
    return [];
  }
  async findByUserIdAndOrganizationId(): Promise<Customer | null> {
    return null;
  }
  async findAll(): Promise<Customer[]> {
    return this.customers;
  }
  async save(): Promise<void> {}
}

function createSettings(statusId: string, ratePercent: number): Settings {
  return Settings.create({
    organizationId: ORGANIZATION_ID,
    businessHours: Settings.createDefault(ORGANIZATION_ID)
      .getBusinessHours()
      .toJSON(),
    consultantStatuses: [
      { statusId: "standard", name: "標準", settlementRatePercent: 30 },
      { statusId, name: "個別", settlementRatePercent: ratePercent },
    ],
    defaultConsultantStatusId: "standard",
    companyInfo: {
      companyName: "みらい予報株式会社",
      address: "東京都渋谷区1-1-1",
      officeAddress: "東京都渋谷区2-2-2 みらいビル",
    },
  });
}

function createUseCase(params: {
  bookings: Booking[];
  payments: Payment[];
  consultantStatusId?: string;
  settings?: Settings | null;
}) {
  const consultant = Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId: CONSULTANT_ID,
    profile: ConsultantProfile.create("山田花子", "", []),
    statusId: params.consultantStatusId ?? "premium",
  });
  const customer = Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId: CUSTOMER_ID,
    name: "佐藤太郎",
    email: "sato@example.com",
    phone: "09000000000",
    birthDate: "1990-01-01",
  });

  return new GetConsultantSettlementStatementUseCase(
    new InMemoryBookingRepository(params.bookings),
    new InMemoryPaymentRepository(params.payments),
    new InMemoryConsultantRepository(consultant),
    new InMemorySettingsRepository(
      params.settings === undefined
        ? createSettings("premium", 35)
        : params.settings,
    ),
    new InMemoryCustomerRepository([customer]),
  );
}

describe("GetConsultantSettlementStatementUseCase", () => {
  it("builds a statement from charged bookings in the period", async () => {
    const booking = createBooking("booking-1", IN_PERIOD_STARTS_AT);
    const useCase = createUseCase({
      bookings: [booking],
      payments: [createPayment("booking-1", 11000, "charged")],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.month).toBe(MONTH);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      bookingId: "booking-1",
      customerName: "佐藤太郎",
      pricePlanName: "30分プラン",
      amountJPY: 11000,
    });
    expect(result.grossJPY).toBe(11000);
    expect(result.systemFeeRatePercent).toBe(35);
    expect(result.systemFeeJPY).toBe(3850);
    expect(result.systemFeeTaxJPY).toBe(385);
    expect(result.officeFeeJPY).toBe(0);
    expect(result.settlementAmountJPY).toBe(6765);
    expect(result.issuedTo).toEqual({
      companyName: "みらい予報株式会社",
      address: "東京都渋谷区1-1-1",
    });
    expect(result.issuer).toEqual({ name: "山田花子", address: null });
  });

  it("adds the office address and its fee when requested", async () => {
    const useCase = createUseCase({
      bookings: [createBooking("booking-1", IN_PERIOD_STARTS_AT)],
      payments: [createPayment("booking-1", 11000, "charged")],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: true,
    });

    expect(result.officeFeeJPY).toBe(500);
    expect(result.settlementAmountJPY).toBe(6265);
    expect(result.issuer.address).toBe("東京都渋谷区2-2-2 みらいビル");
  });

  it("excludes payments that are not charged", async () => {
    const useCase = createUseCase({
      bookings: [
        createBooking("booking-1", IN_PERIOD_STARTS_AT),
        createBooking("booking-2", IN_PERIOD_STARTS_AT),
        createBooking("booking-3", IN_PERIOD_STARTS_AT),
      ],
      payments: [
        createPayment("booking-1", 11000, "charged"),
        createPayment("booking-2", 22000, "refunded"),
        createPayment("booking-3", 33000, "setup_complete"),
      ],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.items.map((item) => item.bookingId)).toEqual(["booking-1"]);
    expect(result.grossJPY).toBe(11000);
  });

  it("excludes bookings outside the period", async () => {
    const useCase = createUseCase({
      bookings: [
        createBooking("booking-1", IN_PERIOD_STARTS_AT),
        createBooking("booking-2", OUT_OF_PERIOD_STARTS_AT),
      ],
      payments: [
        createPayment("booking-1", 11000, "charged"),
        createPayment("booking-2", 11000, "charged"),
      ],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.items.map((item) => item.bookingId)).toEqual(["booking-1"]);
  });

  it("falls back to the default status when the consultant status is missing", async () => {
    const useCase = createUseCase({
      bookings: [createBooking("booking-1", IN_PERIOD_STARTS_AT)],
      payments: [createPayment("booking-1", 11000, "charged")],
      consultantStatusId: "deleted-status",
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.systemFeeRatePercent).toBe(30);
    expect(result.consultantStatusName).toBe("標準");
  });

  it("falls back to the default rate when settings do not exist", async () => {
    const useCase = createUseCase({
      bookings: [createBooking("booking-1", IN_PERIOD_STARTS_AT)],
      payments: [createPayment("booking-1", 11000, "charged")],
      settings: null,
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.systemFeeRatePercent).toBe(30);
    expect(result.issuedTo).toEqual({ companyName: "", address: "" });
  });

  it("returns an empty statement when nothing was charged", async () => {
    const useCase = createUseCase({ bookings: [], payments: [] });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      consultantId: CONSULTANT_ID,
      month: MONTH,
      usesOfficeAddress: false,
    });

    expect(result.items).toEqual([]);
    expect(result.grossJPY).toBe(0);
    expect(result.settlementAmountJPY).toBe(0);
  });
});
