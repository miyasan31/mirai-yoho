import { SendConsultationReminderUseCase } from "@/application/booking/send-consultation-reminder-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { BookingStatus } from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

const ORGANIZATION_ID = "org-1";

function createBooking(params: {
  bookingId: string;
  clientId?: string;
  consultantId?: string;
  startDatetime: string;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  withZoomUrl?: boolean;
  reminderSentAt?: Date;
}): Booking {
  const booking = Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: params.bookingId,
    clientId: params.clientId ?? "client-1",
    consultantId: params.consultantId ?? "consultant-1",
    slotId: `slot-${params.bookingId}`,
    startDatetime: new Date(params.startDatetime),
    consultantMemo: ConsultantMemo.create(""),
  });

  if (params.status && params.status !== "pending") {
    booking.confirm(
      ZoomUrl.create(`https://zoom.example.com/${params.bookingId}`),
    );
    if (params.status === "cancelled") {
      booking.cancel("admin");
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

function createClient(clientId = "client-1"): Client {
  return Client.create({
    organizationId: ORGANIZATION_ID,
    clientId,
    name: "山田 太郎",
    email: "taro@example.com",
    phone: "09012345678",
    birthdate: "1990-01-01",
  });
}

function createConsultant(consultantId = "consultant-1"): Consultant {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId,
    profile: ConsultantProfile.create("田中 相談員", "", []),
    zoomRoomIds: [],
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
        booking.getStartDatetime().getTime() > now.getTime() &&
        booking.getStartDatetime().getTime() <= windowEnd.getTime() &&
        !booking.getConsultationReminderEmailSentAt(),
    );
  }

  async findAll(_organizationId: string): Promise<Booking[]> {
    return this.bookings;
  }

  async save(booking: Booking): Promise<void> {
    this.savedBookings.push(booking);
  }
}

class InMemoryClientRepository implements IClientRepository {
  constructor(private readonly clients: Client[]) {}

  async findById(
    _organizationId: string,
    clientId: string,
  ): Promise<Client | null> {
    return (
      this.clients.find((client) => client.getClientId() === clientId) ?? null
    );
  }

  async findByIds(
    _organizationId: string,
    clientIds: string[],
  ): Promise<Client[]> {
    const ids = new Set(clientIds);
    return this.clients.filter((client) => ids.has(client.getClientId()));
  }

  async findByEmail(
    _organizationId: string,
    email: string,
  ): Promise<Client | null> {
    return this.clients.find((client) => client.getEmail() === email) ?? null;
  }

  async findAll(_organizationId: string): Promise<Client[]> {
    return this.clients;
  }

  async save(_client: Client): Promise<void> {}
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
      startDatetime: "2026-05-01T09:45:00.000Z",
      status: "confirmed",
    });
    const bookingRepository = new InMemoryBookingRepository([
      targetBooking,
      createBooking({
        bookingId: "future",
        startDatetime: "2026-05-01T09:45:01.000Z",
        status: "confirmed",
      }),
      createBooking({
        bookingId: "started",
        startDatetime: "2026-05-01T09:29:59.000Z",
        status: "confirmed",
      }),
      createBooking({
        bookingId: "cancelled",
        startDatetime: "2026-05-01T09:40:00.000Z",
        status: "cancelled",
      }),
      createBooking({
        bookingId: "completed",
        startDatetime: "2026-05-01T09:40:00.000Z",
        status: "completed",
      }),
      createBooking({
        bookingId: "sent",
        startDatetime: "2026-05-01T09:40:00.000Z",
        status: "confirmed",
        reminderSentAt: new Date("2026-05-01T09:20:00.000Z"),
      }),
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryClientRepository([createClient()]),
      new InMemoryConsultantRepository([createConsultant()]),
      emailService,
    );

    const result = await useCase.execute(ORGANIZATION_ID);

    expect(result).toEqual({ sentCount: 1, skippedCount: 0, errors: [] });
    expect(emailService.sendConsultationReminder).toHaveBeenCalledTimes(1);
    expect(emailService.sendConsultationReminder).toHaveBeenCalledWith({
      clientEmail: "taro@example.com",
      clientName: "山田 太郎",
      consultantName: "田中 相談員",
      zoomUrl: "https://zoom.example.com/target",
      startDatetime: new Date("2026-05-01T09:45:00.000Z"),
      bookingId: "target",
    });
    expect(targetBooking.getConsultationReminderEmailSentAt()).toEqual(
      new Date("2026-05-01T09:30:00.000Z"),
    );
    expect(bookingRepository.savedBookings).toEqual([targetBooking]);
  });

  it("continues processing and records errors when a target booking cannot be sent", async () => {
    const missingClientBooking = createBooking({
      bookingId: "missing-client",
      clientId: "missing-client",
      startDatetime: "2026-05-01T09:40:00.000Z",
      status: "confirmed",
    });
    const successfulBooking = createBooking({
      bookingId: "success",
      startDatetime: "2026-05-01T09:41:00.000Z",
      status: "confirmed",
    });
    const bookingRepository = new InMemoryBookingRepository([
      missingClientBooking,
      successfulBooking,
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryClientRepository([createClient()]),
      new InMemoryConsultantRepository([createConsultant()]),
      emailService,
    );

    const result = await useCase.execute(ORGANIZATION_ID);

    expect(result).toEqual({
      sentCount: 1,
      skippedCount: 1,
      errors: [{ bookingId: "missing-client", error: "Client not found" }],
    });
    expect(emailService.sendConsultationReminder).toHaveBeenCalledTimes(1);
    expect(successfulBooking.getConsultationReminderEmailSentAt()).toEqual(
      new Date("2026-05-01T09:30:00.000Z"),
    );
    expect(
      missingClientBooking.getConsultationReminderEmailSentAt(),
    ).toBeUndefined();
    expect(bookingRepository.savedBookings).toEqual([successfulBooking]);
  });

  it("skips the booking when Zoom URL is missing", async () => {
    const missingZoomBooking = Booking.reconstruct({
      organizationId: ORGANIZATION_ID,
      bookingId: "missing-zoom",
      clientId: "client-1",
      consultantId: "consultant-1",
      slotId: "slot-missing-zoom",
      startDatetime: new Date("2026-05-01T09:40:00.000Z"),
      status: BookingStatus.reconstruct("confirmed"),
      cancelDeadline: CancelDeadline.create(
        new Date("2026-05-01T09:40:00.000Z"),
      ),
      consultantMemo: ConsultantMemo.create(""),
    });
    const bookingRepository = new InMemoryBookingRepository([
      missingZoomBooking,
    ]);
    const emailService = createEmailService();
    const useCase = new SendConsultationReminderUseCase(
      bookingRepository,
      new InMemoryClientRepository([createClient()]),
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
