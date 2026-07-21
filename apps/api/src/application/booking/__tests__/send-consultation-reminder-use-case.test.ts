import { SendConsultationReminderUseCase } from "@/application/booking/send-consultation-reminder-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { CancellationCategory } from "@/domain/booking/cancellation-category";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

const ORGANIZATION_ID = "org-1";

function createBooking(params: {
  bookingId: string;
  customerId?: string;
  consultantId?: string;
  startsAt: string;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  withZoomUrl?: boolean;
  reminderSentAt?: Date;
}): Booking {
  const booking = Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: params.bookingId,
    customerId: params.customerId ?? "customer-1",
    consultantId: params.consultantId ?? "consultant-1",
    usageSlotIds: [`slot-${params.bookingId}-1`, `slot-${params.bookingId}-2`],
    bufferSlotIds: [`slot-${params.bookingId}-buffer`],
    startsAt: new Date(params.startsAt),
    endsAt: new Date(new Date(params.startsAt).getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
  });

  if (params.status && params.status !== "pending") {
    booking.confirm(
      ZoomUrl.create(`https://zoom.example.com/${params.bookingId}`),
    );
    if (params.status === "cancelled") {
      booking.cancel({
        cancelledBy: "admin",
        category: CancellationCategory.reconstruct("before_previous_day"),
        at: new Date(),
      });
    }
    if (params.status === "completed") {
      booking.complete();
    }
  } else if (params.withZoomUrl) {
    booking.confirm(
      ZoomUrl.create(`https://zoom.example.com/${params.bookingId}`),
    );
  }

  if (params.reminderSentAt) {
    booking.markConsultationReminderEmailSent(params.reminderSentAt);
  }
  booking.pullDomainEvents();
  return booking;
}

function createCustomer(customerId = "customer-1"): Customer {
  return Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId,
    name: "山田 太郎",
    email: "taro@example.com",
    phone: "09012345678",
    birthDate: "1990-01-01",
  });
}

function createConsultant(consultantId = "consultant-1"): Consultant {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId,
    profile: ConsultantProfile.create("田中 相談員", "", []),
    statusId: "standard",
  });
}

class InMemoryBookingRepository implements IBookingRepository {
  public readonly savedBookings: Booking[] = [];

  constructor(private readonly bookings: Booking[]) {}

  async findById(
    _organizationId: string,
    bookingId: string,
  ): Promise<Booking | null> {
    return (
      this.bookings.find((booking) => booking.getBookingId() === bookingId) ??
      null
    );
  }

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getConsultantId() === consultantId,
    );
  }

  async findByCustomerId(
    _organizationId: string,
    customerId: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getCustomerId() === customerId,
    );
  }

  async findAllByCustomerId(customerId: string): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getCustomerId() === customerId,
    );
  }

  async findAllByCustomerIds(customerIds: string[]): Promise<Booking[]> {
    const ids = new Set(customerIds);
    return this.bookings.filter((booking) => ids.has(booking.getCustomerId()));
  }

  async findByStatus(
    _organizationId: string,
    status: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getStatus().getValue() === status,
    );
  }

  async findConsultationReminderTargets(
    _organizationId: string,
    now: Date,
    windowEnd: Date,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) =>
        booking.getStatus().getValue() === "confirmed" &&
        booking.getStartsAt().getTime() > now.getTime() &&
        booking.getStartsAt().getTime() <= windowEnd.getTime() &&
        !booking.getConsultationReminderEmailSentAt(),
    );
  }

  async findAll(_organizationId: string): Promise<Booking[]> {
    return this.bookings;
  }

  async save(booking: Booking): Promise<void> {
    this.savedBookings.push(booking);
  }
  async saveInTx(booking: Booking): Promise<void> {
    this.savedBookings.push(booking);
  }
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customers: Customer[]) {}

  async findById(
    _organizationId: string,
    customerId: string,
  ): Promise<Customer | null> {
    return (
      this.customers.find(
        (customer) => customer.getCustomerId() === customerId,
      ) ?? null
    );
  }

  async findByIds(
    _organizationId: string,
    customerIds: string[],
  ): Promise<Customer[]> {
    const ids = new Set(customerIds);
    return this.customers.filter((customer) =>
      ids.has(customer.getCustomerId()),
    );
  }

  async findByEmail(
    _organizationId: string,
    email: string,
  ): Promise<Customer | null> {
    return (
      this.customers.find((customer) => customer.getEmail() === email) ?? null
    );
  }

  async findAll(_organizationId: string): Promise<Customer[]> {
    return this.customers;
  }

  async findByEmailAcrossOrganizations(email: string): Promise<Customer[]> {
    return this.customers.filter((customer) => customer.getEmail() === email);
  }

  async findByUserId(userId: string): Promise<Customer[]> {
    return this.customers.filter((customer) => customer.getUserId() === userId);
  }

  async findByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<Customer | null> {
    return (
      this.customers.find(
        (customer) =>
          customer.getUserId() === userId &&
          customer.getOrganizationId() === organizationId,
      ) ?? null
    );
  }

  async save(_customer: Customer): Promise<void> {}
}

class InMemoryConsultantRepository implements IConsultantRepository {
  constructor(private readonly consultants: Consultant[]) {}

  async findById(
    _organizationId: string,
    consultantId: string,
  ): Promise<Consultant | null> {
    return (
      this.consultants.find(
        (consultant) => consultant.getConsultantId() === consultantId,
      ) ?? null
    );
  }

  async findByIds(
    _organizationId: string,
    consultantIds: string[],
  ): Promise<Consultant[]> {
    const ids = new Set(consultantIds);
    return this.consultants.filter((consultant) =>
      ids.has(consultant.getConsultantId()),
    );
  }

  async findAllActive(_organizationId: string): Promise<Consultant[]> {
    return this.consultants.filter((consultant) => consultant.getIsActive());
  }

  async findAll(_organizationId: string): Promise<Consultant[]> {
    return this.consultants;
  }

  async findOrganizationIdsByConsultantId(
    _consultantId: string,
  ): Promise<string[]> {
    return [];
  }

  async findByConsultantId(_consultantId: string): Promise<Consultant[]> {
    return [];
  }

  async save(_consultant: Consultant): Promise<void> {}

  async delete(_organizationId: string, _consultantId: string): Promise<void> {}
}

function createEmailService(
  sendConsultationReminder = vi.fn().mockResolvedValue(undefined),
): IEmailService {
  return {
    sendBookingConfirmation: vi.fn(),
    sendBookingCancellation: vi.fn(),
    sendPaymentReceipt: vi.fn(),
    sendConsultationReminder,
    sendInvitation: vi.fn(),
    sendPasswordReset: vi.fn(),
  };
}

describe("SendConsultationReminderUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T09:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends reminders only for confirmed unsent bookings within 15 minutes before start", async () => {
    const targetBooking = createBooking({
      bookingId: "target",
      startsAt: "2026-05-01T09:45:00.000Z",
      status: "confirmed",
    });
    const bookingRepository = new InMemoryBookingRepository([
      targetBooking,
      createBooking({
        bookingId: "future",
        startsAt: "2026-05-01T09:45:01.000Z",
        status: "confirmed",
      }),
      createBooking({
        bookingId: "started",
        startsAt: "2026-05-01T09:29:59.000Z",
        status: "confirmed",
      }),
      createBooking({
        bookingId: "cancelled",
        startsAt: "2026-05-01T09:40:00.000Z",
        status: "cancelled",
      }),
      createBooking({
        bookingId: "completed",
        startsAt: "2026-05-01T09:40:00.000Z",
        status: "completed",
      }),
      createBooking({
        bookingId: "sent",
        startsAt: "2026-05-01T09:40:00.000Z",
        status: "confirmed",
        reminderSentAt: new Date("2026-05-01T09:20:00.000Z"),
      }),
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryCustomerRepository([createCustomer()]),
      new InMemoryConsultantRepository([createConsultant()]),
      emailService,
    );

    const result = await useCase.execute(ORGANIZATION_ID);

    expect(result).toEqual({ sentCount: 1, skippedCount: 0, errors: [] });
    expect(emailService.sendConsultationReminder).toHaveBeenCalledTimes(1);
    expect(emailService.sendConsultationReminder).toHaveBeenCalledWith({
      customerEmail: "taro@example.com",
      customerName: "山田 太郎",
      consultantName: "田中 相談員",
      joinUrl: "https://zoom.example.com/target",
      startsAt: new Date("2026-05-01T09:45:00.000Z"),
      bookingId: "target",
    });
    expect(targetBooking.getConsultationReminderEmailSentAt()).toEqual(
      new Date("2026-05-01T09:30:00.000Z"),
    );
    expect(bookingRepository.savedBookings).toEqual([targetBooking]);
  });

  it("continues processing and records errors when a target booking cannot be sent", async () => {
    const missingCustomerBooking = createBooking({
      bookingId: "missing-customer",
      customerId: "missing-customer",
      startsAt: "2026-05-01T09:40:00.000Z",
      status: "confirmed",
    });
    const successfulBooking = createBooking({
      bookingId: "success",
      startsAt: "2026-05-01T09:41:00.000Z",
      status: "confirmed",
    });
    const bookingRepository = new InMemoryBookingRepository([
      missingCustomerBooking,
      successfulBooking,
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryCustomerRepository([createCustomer()]),
      new InMemoryConsultantRepository([createConsultant()]),
      emailService,
    );

    const result = await useCase.execute(ORGANIZATION_ID);

    expect(result).toEqual({
      sentCount: 1,
      skippedCount: 1,
      errors: [{ bookingId: "missing-customer", error: "Customer not found" }],
    });
    expect(emailService.sendConsultationReminder).toHaveBeenCalledTimes(1);
    expect(successfulBooking.getConsultationReminderEmailSentAt()).toEqual(
      new Date("2026-05-01T09:30:00.000Z"),
    );
    expect(
      missingCustomerBooking.getConsultationReminderEmailSentAt(),
    ).toBeUndefined();
    expect(bookingRepository.savedBookings).toEqual([successfulBooking]);
  });

  it("skips the booking when Zoom URL is missing", async () => {
    const missingZoomBooking = Booking.reconstruct({
      organizationId: ORGANIZATION_ID,
      bookingId: "missing-zoom",
      customerId: "customer-1",
      consultantId: "consultant-1",
      usageSlotIds: ["slot-missing-zoom-1", "slot-missing-zoom-2"],
      bufferSlotIds: ["slot-missing-zoom-buffer"],
      startsAt: new Date("2026-05-01T09:40:00.000Z"),
      endsAt: new Date("2026-05-01T10:10:00.000Z"),
      durationMinutes: 30,
      status: BookingStatus.reconstruct("confirmed"),
      cancelDeadlineAt: CancelDeadline.create(
        new Date("2026-05-01T09:40:00.000Z"),
      ),
      consultantMemo: ConsultantMemo.empty(),
    });
    const bookingRepository = new InMemoryBookingRepository([
      missingZoomBooking,
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryCustomerRepository([createCustomer()]),
      new InMemoryConsultantRepository([createConsultant()]),
      emailService,
    );

    const result = await useCase.execute(ORGANIZATION_ID);

    expect(result).toEqual({
      sentCount: 0,
      skippedCount: 1,
      errors: [{ bookingId: "missing-zoom", error: "Zoom URL not found" }],
    });
    expect(emailService.sendConsultationReminder).not.toHaveBeenCalled();
  });
});
