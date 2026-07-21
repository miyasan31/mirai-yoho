import { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { Payment } from "@/domain/payment/payment";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import type { TransactionScope } from "@/domain/shared/transaction-scope";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import type { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

const ORGANIZATION_ID = "org-1";
const BOOKING_ID = "booking-1";
const CUSTOMER_ID = "customer-1";
const CONSULTANT_ID = "consultant-1";

class InMemoryBookingRepository implements IBookingRepository {
  constructor(private readonly booking: Booking | null) {}

  async findById(): Promise<Booking | null> {
    return this.booking;
  }
  async findByConsultantId(): Promise<Booking[]> {
    return [];
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
    return [];
  }
  async save(): Promise<void> {}
  async saveInTx(): Promise<void> {}
}

class InMemoryPaymentRepository implements IPaymentRepository {
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
    return [];
  }
  async save(): Promise<void> {}
}

class InMemorySlotRepository implements ISlotRepository {
  async findById(): Promise<Slot | null> {
    return null;
  }
  async findByIdsInTx(
    _organizationId: string,
    _slotIds: readonly string[],
    _tx: TransactionScope,
  ): Promise<Slot[]> {
    return [];
  }
  async findByOrganizationId(): Promise<Slot[]> {
    return [];
  }
  async findByConsultantId(): Promise<Slot[]> {
    return [];
  }
  async findAvailableByConsultantId(): Promise<Slot[]> {
    return [];
  }
  async findAvailableByTimeRange(): Promise<Slot[]> {
    return [];
  }
  async findAvailableChainByConsultant(): Promise<Slot[] | null> {
    return null;
  }
  async delete(): Promise<void> {}
  async save(): Promise<void> {}
  async saveInTx(): Promise<void> {}
}

class InMemoryZoomSessionRepository implements IZoomSessionRepository {
  async findByDate(): Promise<ZoomSession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customer: Customer | null) {}
  async findById(): Promise<Customer | null> {
    return this.customer;
  }
  async findByEmail(): Promise<Customer | null> {
    return null;
  }
  async findAll(): Promise<Customer[]> {
    return [];
  }
  async findByIds(): Promise<Customer[]> {
    return [];
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
    return [];
  }
  async findByConsultantId(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

class InMemoryUserCouponRepository implements IUserCouponRepository {
  async findById(): Promise<UserCoupon | null> {
    return null;
  }
  async findByUserId(): Promise<UserCoupon[]> {
    return [];
  }
  async findByUserIdAndCouponId(): Promise<UserCoupon[]> {
    return [];
  }
  async findRedeemableByUserId(): Promise<UserCoupon[]> {
    return [];
  }
  async countByCouponId(): Promise<number> {
    return 0;
  }
  async save(): Promise<void> {}
  async saveMany(): Promise<void> {}
}

function createConfirmedBooking(startsAt: string): Booking {
  const start = new Date(startsAt);
  const booking = Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    consultantId: CONSULTANT_ID,
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt: start,
    endsAt: new Date(start.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.create({
      customerName: "",
      birthDate: "",
      appraisalDate: "",
      freeMemo: "",
    }),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
  });
  booking.confirm(ZoomUrl.create("https://zoom.us/j/test"));
  return booking;
}

function createCustomer(): Customer {
  return Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId: CUSTOMER_ID,
    name: "山田 太郎",
    email: "taro@example.com",
    phone: "09012345678",
    birthDate: "1990-01-01",
  });
}

function createConsultant(): Consultant {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId: CONSULTANT_ID,
    profile: ConsultantProfile.create("藤原 花子", "bio", []),
    statusId: "status-1",
  });
}

function createEmailServiceMock(): IEmailService {
  return {
    sendBookingConfirmation: vi.fn(),
    sendBookingCancellation: vi.fn(),
    sendPaymentReceipt: vi.fn(),
    sendConsultationReminder: vi.fn(),
    sendInvitation: vi.fn(),
    sendPasswordReset: vi.fn(),
  };
}

function createUseCase(overrides?: {
  booking?: Booking | null;
  customer?: Customer | null;
  consultant?: Consultant | null;
  emailService?: IEmailService;
}) {
  const emailService = overrides?.emailService ?? createEmailServiceMock();
  const stripeService: IStripeService = {
    createSetupIntent: vi.fn(),
    createPaymentIntent: vi.fn(),
    createOffSessionPaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    refundPaymentIntent: vi.fn(),
  };
  const zoomService: IZoomService = {
    createDailyMeeting: vi.fn(),
    updateBreakoutRooms: vi.fn(),
  };

  const useCase = new CancelBookingUseCase(
    new InMemoryBookingRepository(
      overrides?.booking ?? createConfirmedBooking("2027-01-01T10:00:00.000Z"),
    ),
    new InMemoryPaymentRepository(),
    new InMemorySlotRepository(),
    stripeService,
    emailService,
    new InMemoryZoomSessionRepository(),
    zoomService,
    new InMemoryCustomerRepository(
      overrides?.customer === undefined ? createCustomer() : overrides.customer,
    ),
    new InMemoryConsultantRepository(
      overrides?.consultant === undefined
        ? createConsultant()
        : overrides.consultant,
    ),
    new InMemoryUserCouponRepository(),
  );

  return { useCase, emailService };
}

describe("CancelBookingUseCase", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends the cancellation email with the real customer and consultant identity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:00.000Z"));
    const { useCase, emailService } = createUseCase();

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });

    expect(emailService.sendBookingCancellation).toHaveBeenCalledTimes(1);
    expect(emailService.sendBookingCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "taro@example.com",
        customerName: "山田 太郎",
        consultantName: "藤原 花子",
        bookingId: BOOKING_ID,
        cancelledBy: "customer",
      }),
    );
  });

  it("classifies a cancel before the booking day as before_previous_day with no fee", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:00.000Z"));
    const { useCase, emailService } = createUseCase();

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });

    expect(emailService.sendBookingCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellationCategory: "before_previous_day",
        cancellationFeeJPY: 0,
        refundJPY: 5500,
      }),
    );
  });

  it("classifies a same-day cancel as on_the_day charging the full fee", async () => {
    vi.useFakeTimers();
    // JST 2027-01-01 05:00 (booking is JST 2027-01-01 19:00).
    vi.setSystemTime(new Date("2026-12-31T20:00:00.000Z"));
    const { useCase, emailService } = createUseCase();

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });

    expect(emailService.sendBookingCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        cancellationCategory: "on_the_day",
        cancellationFeeJPY: 5500,
        refundJPY: 0,
      }),
    );
  });

  it("skips the cancellation email when the customer cannot be resolved", async () => {
    const { useCase, emailService } = createUseCase({ customer: null });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "admin",
    });

    expect(emailService.sendBookingCancellation).not.toHaveBeenCalled();
  });

  it("uses an empty consultant name when the consultant cannot be resolved", async () => {
    const { useCase, emailService } = createUseCase({ consultant: null });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "admin",
    });

    expect(emailService.sendBookingCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: "taro@example.com",
        consultantName: "",
        cancelledBy: "admin",
      }),
    );
  });
});
