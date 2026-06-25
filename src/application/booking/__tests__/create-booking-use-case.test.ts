import { afterEach, beforeEach, vi } from "vitest";
import { CreateBookingUseCase } from "@/application/booking/create-booking-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import {
  ConsultantPricePlan,
  createPricePlanSelectionId,
} from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import type { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";

const ORGANIZATION_ID = "org-1";
const DEFAULT_PRICE_PLAN_NAME = "通常鑑定";
const DEFAULT_PRICE_PLAN_TOTAL_JPY = 5000;
const DEFAULT_PRICE_PLAN_SELECTION_ID = createPricePlanSelectionId({
  name: DEFAULT_PRICE_PLAN_NAME,
  totalJPY: DEFAULT_PRICE_PLAN_TOTAL_JPY,
});

function createConsultant(consultantId: string, name: string) {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId,
    profile: ConsultantProfile.create(name, "", []),
    zoomRoomIds: [],
    rankId: "standard",
  });
}

function createSlot(
  slotId: string,
  consultantId: string,
  startsAt: string,
  endsAt: string,
) {
  return Slot.create({
    organizationId: ORGANIZATION_ID,
    slotId,
    consultantId,
    timeRange: TimeRange.reconstruct(new Date(startsAt), new Date(endsAt)),
  });
}

class InMemorySlotRepository implements ISlotRepository {
  constructor(private readonly slots: Slot[]) {}

  async findById(
    _organizationId: string,
    slotId: string,
  ): Promise<Slot | null> {
    return this.slots.find((slot) => slot.getSlotId() === slotId) ?? null;
  }

  async findAllAvailable(_organizationId: string): Promise<Slot[]> {
    return this.slots.filter((slot) => slot.getIsAvailable());
  }

  async findByOrganizationId(_organizationId: string): Promise<Slot[]> {
    return this.slots;
  }

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<Slot[]> {
    return this.slots.filter((slot) => slot.getConsultantId() === consultantId);
  }

  async findAvailableByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<Slot[]> {
    return this.slots.filter(
      (slot) =>
        slot.getConsultantId() === consultantId && slot.getIsAvailable(),
    );
  }

  async findAvailableByTimeRange(
    _organizationId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Slot[]> {
    return this.slots.filter(
      (slot) =>
        slot.getIsAvailable() &&
        slot.getTimeRange().getStartsAt().getTime() === startsAt.getTime() &&
        slot.getTimeRange().getEndsAt().getTime() === endsAt.getTime(),
    );
  }

  async findAvailableByDate(
    _organizationId: string,
    date: Date,
  ): Promise<Slot[]> {
    return this.slots.filter(
      (slot) =>
        slot.getIsAvailable() &&
        slot.getTimeRange().getStartsAt().toISOString().slice(0, 10) ===
          date.toISOString().slice(0, 10),
    );
  }

  async save(_slot: Slot): Promise<void> {}

  async delete(_organizationId: string, _slotId: string): Promise<void> {}
}

class InMemoryCustomerRepository implements ICustomerRepository {
  public readonly customers: Customer[] = [];

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

  async findByIds(
    _organizationId: string,
    customerIds: string[],
  ): Promise<Customer[]> {
    const ids = new Set(customerIds);
    return this.customers.filter((customer) =>
      ids.has(customer.getCustomerId()),
    );
  }

  async save(customer: Customer): Promise<void> {
    this.customers.push(customer);
  }
}

class InMemoryBookingRepository implements IBookingRepository {
  public readonly bookings: Booking[] = [];

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

  async findByStatus(
    _organizationId: string,
    status: string,
  ): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) => booking.getStatus().getValue() === status,
    );
  }

  async findConsultationReminderTargets(): Promise<Booking[]> {
    return this.bookings.filter(
      (booking) =>
        booking.getStatus().getValue() === "confirmed" &&
        !booking.getConsultationReminderEmailSentAt(),
    );
  }

  async findAll(_organizationId: string): Promise<Booking[]> {
    return this.bookings;
  }

  async save(booking: Booking): Promise<void> {
    this.bookings.push(booking);
  }
}

class InMemoryZoomDailySessionRepository
  implements IZoomDailySessionRepository
{
  public session: ZoomDailySession | null = null;

  async findByDate(
    _organizationId: string,
    _sessionDate: string,
  ): Promise<ZoomDailySession | null> {
    return this.session;
  }

  async save(session: ZoomDailySession): Promise<void> {
    this.session = session;
  }
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

  async findAllActive(_organizationId: string): Promise<Consultant[]> {
    return this.consultants.filter((consultant) => consultant.getIsActive());
  }

  async findAll(_organizationId: string): Promise<Consultant[]> {
    return this.consultants;
  }

  async save(_consultant: Consultant): Promise<void> {}

  async delete(_organizationId: string, _consultantId: string): Promise<void> {}
}

class InMemoryConsultantPricePlanRepository
  implements IConsultantPricePlanRepository
{
  constructor(private readonly pricePlans: ConsultantPricePlan[]) {}

  async findById(
    _organizationId: string,
    pricePlanId: string,
  ): Promise<ConsultantPricePlan | null> {
    return (
      this.pricePlans.find(
        (pricePlan) => pricePlan.getPricePlanId() === pricePlanId,
      ) ?? null
    );
  }

  async findByConsultantId(
    _organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    return this.pricePlans.filter(
      (pricePlan) => pricePlan.getConsultantId() === consultantId,
    );
  }

  async findActiveByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<ConsultantPricePlan[]> {
    return (await this.findByConsultantId(organizationId, consultantId)).filter(
      (pricePlan) => pricePlan.isActive(),
    );
  }

  async findBySignature(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<ConsultantPricePlan | null> {
    return (
      this.pricePlans.find(
        (pricePlan) =>
          pricePlan.getOrganizationId() === params.organizationId &&
          pricePlan.getConsultantId() === params.consultantId &&
          pricePlan.getNormalizedName() === params.normalizedName &&
          pricePlan.getTotalJPY() === params.totalJPY,
      ) ?? null
    );
  }

  async save(pricePlan: ConsultantPricePlan): Promise<void> {
    this.pricePlans.push(pricePlan);
  }
}

class InMemoryOrganizationSettingsRepository
  implements IOrganizationSettingsRepository
{
  async findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationSettings | null> {
    return OrganizationSettings.createDefault(organizationId);
  }

  async save(_settings: OrganizationSettings): Promise<void> {}
}

function createPricePlan(consultantId: string) {
  return ConsultantPricePlan.create({
    organizationId: ORGANIZATION_ID,
    consultantId,
    pricePlanId: `plan-${consultantId}`,
    name: DEFAULT_PRICE_PLAN_NAME,
    totalJPY: DEFAULT_PRICE_PLAN_TOTAL_JPY,
  });
}

function createUseCase(
  slots: Slot[],
  options?: {
    consultants?: Consultant[];
    zoomService?: IZoomService;
    emailService?: IEmailService;
    pricePlans?: ConsultantPricePlan[];
  },
) {
  const slotRepository = new InMemorySlotRepository(slots);
  const customerRepository = new InMemoryCustomerRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const zoomDailySessionRepository = new InMemoryZoomDailySessionRepository();
  const consultantRepository = new InMemoryConsultantRepository([
    ...(options?.consultants ?? [
      createConsultant("consultant-1", "田中"),
      createConsultant("consultant-2", "佐藤"),
    ]),
  ]);
  const consultantPricePlanRepository =
    new InMemoryConsultantPricePlanRepository(
      options?.pricePlans ??
        [...new Set(slots.map((slot) => slot.getConsultantId()))].map(
          createPricePlan,
        ),
    );

  const defaultZoomService: IZoomService = {
    createDailyMeeting: vi.fn().mockResolvedValue({
      meetingId: "meeting-1",
      joinUrl: "https://zoom.us/j/meeting-1",
    }),
    updateBreakoutRooms: vi.fn().mockResolvedValue(undefined),
  };
  const unitOfWork: IUnitOfWork = {
    runInTransaction: async (fn) => {
      await fn();
    },
  };
  const defaultEmailService: IEmailService = {
    sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
    sendBookingCancellation: vi.fn().mockResolvedValue(undefined),
    sendPaymentReceipt: vi.fn().mockResolvedValue(undefined),
    sendConsultationReminder: vi.fn().mockResolvedValue(undefined),
    sendInvitation: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  };

  return {
    useCase: new CreateBookingUseCase(
      slotRepository,
      customerRepository,
      bookingRepository,
      options?.zoomService ?? defaultZoomService,
      unitOfWork,
      options?.emailService ?? defaultEmailService,
      zoomDailySessionRepository,
      consultantRepository,
      consultantPricePlanRepository,
      new InMemoryOrganizationSettingsRepository(),
    ),
    bookingRepository,
    customerRepository,
  };
}

describe("CreateBookingUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-assigns the consultant with fewer remaining slots on the same day", async () => {
    const { useCase, bookingRepository } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
      createSlot(
        "slot-2",
        "consultant-2",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
      createSlot(
        "slot-3",
        "consultant-1",
        "2026-05-01T11:00:00.000Z",
        "2026-05-01T11:30:00.000Z",
      ),
    ]);

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      startsAt: new Date("2026-05-01T10:00:00.000Z"),
      endsAt: new Date("2026-05-01T10:30:00.000Z"),
      customerName: "山田太郎",
      customerEmail: "taro@example.com",
      customerPhone: "090-1234-5678",
      customerBirthDate: "1990-01-01",
      selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
    });

    expect(bookingRepository.bookings).toHaveLength(1);
    expect(bookingRepository.bookings[0]?.getConsultantId()).toBe(
      "consultant-2",
    );
  });

  it("uses consultantId ascending as a stable tie-breaker", async () => {
    const { useCase, bookingRepository } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-2",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
      createSlot(
        "slot-2",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
    ]);

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      startsAt: new Date("2026-05-01T10:00:00.000Z"),
      endsAt: new Date("2026-05-01T10:30:00.000Z"),
      customerName: "山田太郎",
      customerEmail: "taro@example.com",
      customerPhone: "090-1234-5678",
      customerBirthDate: "1990-01-01",
      selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
    });

    expect(bookingRepository.bookings[0]?.getConsultantId()).toBe(
      "consultant-1",
    );
  });

  it("keeps slotId booking flow working", async () => {
    const { useCase, bookingRepository } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
    ]);

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      slotId: "slot-1",
      customerName: "山田太郎",
      customerEmail: "taro@example.com",
      customerPhone: "090-1234-5678",
      customerBirthDate: "1990-01-01",
      selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
    });

    expect(bookingRepository.bookings[0]?.getConsultantId()).toBe(
      "consultant-1",
    );
  });

  it("throws when the selected datetime is no longer available", async () => {
    const { useCase } = createUseCase([]);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        startsAt: new Date("2026-05-01T10:00:00.000Z"),
        endsAt: new Date("2026-05-01T10:30:00.000Z"),
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toThrow("Slot is no longer available");
  });

  it("throws domain error when consultant cannot be resolved", async () => {
    const { useCase } = createUseCase(
      [
        createSlot(
          "slot-1",
          "consultant-missing",
          "2026-05-01T10:00:00.000Z",
          "2026-05-01T10:30:00.000Z",
        ),
      ],
      { consultants: [] },
    );

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        slotId: "slot-1",
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toMatchObject({
      code: "CONSULTANT_NOT_FOUND",
    });
  });

  it("rejects slotId bookings after the 15-minute cutoff", async () => {
    vi.setSystemTime(new Date("2026-05-01T09:45:00.000Z"));
    const { useCase } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
    ]);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        slotId: "slot-1",
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toMatchObject({
      code: "BOOKING_CUTOFF_EXCEEDED",
    });
  });

  it("rejects auto-assigned bookings after the 15-minute cutoff", async () => {
    vi.setSystemTime(new Date("2026-05-01T09:45:00.000Z"));
    const { useCase } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
    ]);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        startsAt: new Date("2026-05-01T10:00:00.000Z"),
        endsAt: new Date("2026-05-01T10:30:00.000Z"),
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toMatchObject({
      code: "BOOKING_CUTOFF_EXCEEDED",
    });
  });

  it("throws app error and does not persist booking when zoom integration fails", async () => {
    const zoomService: IZoomService = {
      createDailyMeeting: vi.fn().mockRejectedValue(new Error("zoom error")),
      updateBreakoutRooms: vi.fn().mockResolvedValue(undefined),
    };
    const { useCase, bookingRepository, customerRepository } = createUseCase(
      [
        createSlot(
          "slot-1",
          "consultant-1",
          "2026-05-01T10:00:00.000Z",
          "2026-05-01T10:30:00.000Z",
        ),
      ],
      { zoomService },
    );

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        slotId: "slot-1",
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "ZOOM_INTEGRATION_ERROR",
    });

    expect(bookingRepository.bookings).toHaveLength(0);
    expect(customerRepository.customers).toHaveLength(0);
  });

  it("throws app error and does not persist booking when email delivery fails", async () => {
    const emailService: IEmailService = {
      sendBookingConfirmation: vi
        .fn()
        .mockRejectedValue(new Error("email delivery failed")),
      sendBookingCancellation: vi.fn().mockResolvedValue(undefined),
      sendPaymentReceipt: vi.fn().mockResolvedValue(undefined),
      sendConsultationReminder: vi.fn().mockResolvedValue(undefined),
      sendInvitation: vi.fn().mockResolvedValue(undefined),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    };
    const { useCase, bookingRepository, customerRepository } = createUseCase(
      [
        createSlot(
          "slot-1",
          "consultant-1",
          "2026-05-01T10:00:00.000Z",
          "2026-05-01T10:30:00.000Z",
        ),
      ],
      { emailService },
    );

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        slotId: "slot-1",
        customerName: "山田太郎",
        customerEmail: "taro@example.com",
        customerPhone: "090-1234-5678",
        customerBirthDate: "1990-01-01",
        selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "EMAIL_DELIVERY_ERROR",
    });

    expect(bookingRepository.bookings).toHaveLength(0);
    expect(customerRepository.customers).toHaveLength(0);
  });

  it("updates existing customer birthDate with latest input", async () => {
    const { useCase, customerRepository } = createUseCase([
      createSlot(
        "slot-1",
        "consultant-1",
        "2026-05-01T10:00:00.000Z",
        "2026-05-01T10:30:00.000Z",
      ),
    ]);
    customerRepository.customers.push(
      Customer.create({
        organizationId: ORGANIZATION_ID,
        customerId: "customer-1",
        name: "既存太郎",
        email: "taro@example.com",
        phone: "090-1111-2222",
        birthDate: "1980-01-01",
      }),
    );

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      slotId: "slot-1",
      customerName: "山田太郎",
      customerEmail: "taro@example.com",
      customerPhone: "090-1234-5678",
      customerBirthDate: "1995-12-31",
      selectionId: DEFAULT_PRICE_PLAN_SELECTION_ID,
    });

    const existingCustomer = customerRepository.customers[0];
    expect(existingCustomer?.getBirthDate()).toBe("1995-12-31");
    expect(existingCustomer?.getName()).toBe("山田太郎");
  });
});
