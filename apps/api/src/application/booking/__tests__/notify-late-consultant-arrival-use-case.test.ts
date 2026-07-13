import { NotifyLateConsultantArrivalUseCase } from "@/application/booking/notify-late-consultant-arrival-use-case";
import type {
  ILateArrivalAlertService,
  LateArrivalAlertParams,
} from "@/application/shared/late-arrival-alert-service";
import type {
  IUserContactService,
  UserContact,
} from "@/application/shared/user-contact-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

const ORGANIZATION_ID = "org-1";
const NOW = new Date("2026-05-01T10:30:00.000Z");

function createBooking(
  overrides: {
    bookingId?: string;
    status?: "pending" | "confirmed" | "completed" | "cancelled";
    startsAt?: Date;
    consultantJoinedAt?: Date;
    lateArrivalAlertSentAt?: Date;
  } = {},
) {
  return Booking.reconstruct({
    organizationId: ORGANIZATION_ID,
    bookingId: overrides.bookingId ?? "booking-1",
    customerId: "customer-1",
    consultantId: "consultant-1",
    slotId: "slot-1",
    startsAt: overrides.startsAt ?? new Date("2026-05-01T10:00:00.000Z"),
    status: BookingStatus.reconstruct(overrides.status ?? "confirmed"),
    cancelDeadlineAt: CancelDeadline.reconstruct(
      new Date("2026-04-30T10:00:00.000Z"),
    ),
    joinUrl: ZoomUrl.reconstruct("https://zoom.us/j/123"),
    consultantJoinedAt: overrides.consultantJoinedAt,
    lateArrivalAlertSentAt: overrides.lateArrivalAlertSentAt,
    consultantMemo: ConsultantMemo.empty(),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

function createConsultant() {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId: "consultant-1",
    profile: ConsultantProfile.create("佐藤相談員", "", [], "090-1111-2222"),
    statusId: "standard",
  });
}

function createCustomer() {
  return Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId: "customer-1",
    name: "山田太郎",
    email: "customer@example.com",
    phone: "080-1111-2222",
    birthDate: "1990-01-01",
  });
}

class InMemoryBookingRepository implements IBookingRepository {
  public savedBookings: Booking[] = [];

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

  async findByConsultantId(): Promise<Booking[]> {
    return this.bookings;
  }

  async findByCustomerId(
    _organizationId: string,
    customerId: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getCustomerId() === customerId,
    );
  }

  async findByStatus(_organizationId: string, status: string) {
    return this.bookings.filter(
      (booking) => booking.getStatus().getValue() === status,
    );
  }

  async findConsultationReminderTargets(): Promise<Booking[]> {
    return [];
  }

  async findAll(): Promise<Booking[]> {
    return this.bookings;
  }

  async save(booking: Booking): Promise<void> {
    this.savedBookings.push(booking);
  }
}

class InMemoryConsultantRepository implements IConsultantRepository {
  constructor(private readonly consultant: Consultant | null) {}

  async findById(): Promise<Consultant | null> {
    return this.consultant;
  }

  async findAllActive(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }

  async findAll(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }

  async save(): Promise<void> {}

  async delete(): Promise<void> {}
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

  async findByIds(_organizationId: string, customerIds: string[]) {
    return this.customers.filter((customer) =>
      customerIds.includes(customer.getCustomerId()),
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

  async findAll(): Promise<Customer[]> {
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

  async save(): Promise<void> {}
}

class InMemoryUserContactService implements IUserContactService {
  async findByUids(): Promise<Map<string, UserContact>> {
    return new Map([
      [
        "consultant-1",
        { uid: "consultant-1", email: "consultant@example.com" },
      ],
    ]);
  }
}

class RecordingLateArrivalAlertService implements ILateArrivalAlertService {
  public readonly sentAlerts: LateArrivalAlertParams[] = [];

  constructor(private readonly shouldFail = false) {}

  async sendLateArrivalAlert(params: LateArrivalAlertParams): Promise<void> {
    if (this.shouldFail) {
      throw new Error("webhook failed");
    }
    this.sentAlerts.push(params);
  }
}

function createUseCase(params: {
  bookings: Booking[];
  alertService?: RecordingLateArrivalAlertService;
}) {
  const bookingRepository = new InMemoryBookingRepository(params.bookings);
  const alertService =
    params.alertService ?? new RecordingLateArrivalAlertService();
  const useCase = new NotifyLateConsultantArrivalUseCase(
    bookingRepository,
    new InMemoryConsultantRepository(createConsultant()),
    new InMemoryCustomerRepository([createCustomer()]),
    new InMemoryUserContactService(),
    alertService,
    "https://example.com",
  );

  return { useCase, bookingRepository, alertService };
}

describe("NotifyLateConsultantArrivalUseCase", () => {
  it("開始済みで未入室かつ未通知の confirmed 予約へ通知し、通知済み時刻を保存する", async () => {
    const booking = createBooking();
    const { useCase, bookingRepository, alertService } = createUseCase({
      bookings: [booking],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(result).toEqual({ targetCount: 1, notifiedCount: 1, errors: [] });
    expect(alertService.sentAlerts).toHaveLength(1);
    expect(alertService.sentAlerts[0]).toMatchObject({
      organizationId: ORGANIZATION_ID,
      bookingId: "booking-1",
      consultantName: "佐藤相談員",
      consultantEmail: "consultant@example.com",
      consultantPhone: "090-1111-2222",
      customerName: "山田太郎",
      elapsedMinutes: 30,
      adminBookingsUrl: "https://example.com/org-1/admin/bookings",
    });
    expect(bookingRepository.savedBookings).toHaveLength(1);
    expect(booking.getLateArrivalAlertSentAt()).toEqual(NOW);
  });

  it("開始前・入室済み・通知済み・未確定予約は対象外にする", async () => {
    const { useCase, alertService } = createUseCase({
      bookings: [
        createBooking({
          bookingId: "future",
          startsAt: new Date("2026-05-01T11:00:00.000Z"),
        }),
        createBooking({
          bookingId: "joined",
          consultantJoinedAt: new Date("2026-05-01T10:05:00.000Z"),
        }),
        createBooking({
          bookingId: "already-alerted",
          lateArrivalAlertSentAt: new Date("2026-05-01T10:10:00.000Z"),
        }),
        createBooking({ bookingId: "pending", status: "pending" }),
        createBooking({ bookingId: "completed", status: "completed" }),
        createBooking({ bookingId: "cancelled", status: "cancelled" }),
      ],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(result).toEqual({ targetCount: 0, notifiedCount: 0, errors: [] });
    expect(alertService.sentAlerts).toHaveLength(0);
  });

  it("Webhook 失敗時は通知済みにせずエラーを返す", async () => {
    const booking = createBooking();
    const { useCase, bookingRepository } = createUseCase({
      bookings: [booking],
      alertService: new RecordingLateArrivalAlertService(true),
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      now: NOW,
    });

    expect(result.targetCount).toBe(1);
    expect(result.notifiedCount).toBe(0);
    expect(result.errors).toEqual([
      { bookingId: "booking-1", error: "webhook failed" },
    ]);
    expect(bookingRepository.savedBookings).toHaveLength(0);
    expect(booking.getLateArrivalAlertSentAt()).toBeUndefined();
  });
});
