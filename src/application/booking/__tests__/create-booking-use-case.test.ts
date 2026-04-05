import { describe, expect, it, vi } from "vitest";
import { CreateBookingUseCase } from "@/application/booking/create-booking-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { TimeRange } from "@/domain/slot/time-range";
import type { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";

const ORGANIZATION_ID = "org-1";

function createConsultant(consultantId: string, displayName: string) {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId,
    profile: ConsultantProfile.create(displayName, "", []),
    zoomRoomIds: [],
  });
}

function createSlot(
  slotId: string,
  consultantId: string,
  startDatetime: string,
  endDatetime: string,
) {
  return Slot.create({
    organizationId: ORGANIZATION_ID,
    slotId,
    consultantId,
    timeRange: TimeRange.reconstruct(
      new Date(startDatetime),
      new Date(endDatetime),
    ),
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
    return this.slots.filter((slot) => !slot.getIsReserved());
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
        slot.getConsultantId() === consultantId && !slot.getIsReserved(),
    );
  }

  async findAvailableByTimeRange(
    _organizationId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<Slot[]> {
    return this.slots.filter(
      (slot) =>
        !slot.getIsReserved() &&
        slot.getTimeRange().getStartAt().getTime() === startAt.getTime() &&
        slot.getTimeRange().getEndAt().getTime() === endAt.getTime(),
    );
  }

  async findAvailableByDate(
    _organizationId: string,
    date: Date,
  ): Promise<Slot[]> {
    return this.slots.filter(
      (slot) =>
        !slot.getIsReserved() &&
        slot.getTimeRange().getStartAt().toISOString().slice(0, 10) ===
          date.toISOString().slice(0, 10),
    );
  }

  async save(_slot: Slot): Promise<void> {}

  async delete(_organizationId: string, _slotId: string): Promise<void> {}
}

class InMemoryClientRepository implements IClientRepository {
  public readonly clients: Client[] = [];

  async findById(
    _organizationId: string,
    clientId: string,
  ): Promise<Client | null> {
    return (
      this.clients.find((client) => client.getClientId() === clientId) ?? null
    );
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

  async save(client: Client): Promise<void> {
    this.clients.push(client);
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

  async save(_consultant: Consultant): Promise<void> {}

  async delete(_organizationId: string, _consultantId: string): Promise<void> {}
}

function createUseCase(slots: Slot[]) {
  const slotRepository = new InMemorySlotRepository(slots);
  const clientRepository = new InMemoryClientRepository();
  const bookingRepository = new InMemoryBookingRepository();
  const zoomDailySessionRepository = new InMemoryZoomDailySessionRepository();
  const consultantRepository = new InMemoryConsultantRepository([
    createConsultant("consultant-1", "田中"),
    createConsultant("consultant-2", "佐藤"),
  ]);

  const zoomService: IZoomService = {
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
  const emailService: IEmailService = {
    sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
    sendBookingCancellation: vi.fn().mockResolvedValue(undefined),
    sendPaymentReceipt: vi.fn().mockResolvedValue(undefined),
    sendInvitation: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  };

  return {
    useCase: new CreateBookingUseCase(
      slotRepository,
      clientRepository,
      bookingRepository,
      zoomService,
      unitOfWork,
      emailService,
      zoomDailySessionRepository,
      consultantRepository,
    ),
    bookingRepository,
  };
}

describe("CreateBookingUseCase", () => {
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
      startDatetime: new Date("2026-05-01T10:00:00.000Z"),
      endDatetime: new Date("2026-05-01T10:30:00.000Z"),
      clientName: "山田太郎",
      clientEmail: "taro@example.com",
      clientPhone: "090-1234-5678",
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
      startDatetime: new Date("2026-05-01T10:00:00.000Z"),
      endDatetime: new Date("2026-05-01T10:30:00.000Z"),
      clientName: "山田太郎",
      clientEmail: "taro@example.com",
      clientPhone: "090-1234-5678",
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
      clientName: "山田太郎",
      clientEmail: "taro@example.com",
      clientPhone: "090-1234-5678",
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
        startDatetime: new Date("2026-05-01T10:00:00.000Z"),
        endDatetime: new Date("2026-05-01T10:30:00.000Z"),
        clientName: "山田太郎",
        clientEmail: "taro@example.com",
        clientPhone: "090-1234-5678",
      }),
    ).rejects.toThrow("Slot is no longer available");
  });
});
