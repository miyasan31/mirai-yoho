import { GetZoomSessionUseCase } from "@/application/zoom-session/get-zoom-session-use-case";
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
import { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

const ORGANIZATION_ID = "org-1";
const SESSION_DATE = "2026-05-01";

/** JST 2026-05-01 19:00 */
const STARTS_AT = new Date("2026-05-01T10:00:00.000Z");
/** JST 2026-05-01 19:30 */
const ENDS_AT = new Date("2026-05-01T10:30:00.000Z");

function createBooking(
  overrides: {
    bookingId?: string;
    status?: "pending" | "confirmed" | "completed" | "cancelled";
    startsAt?: Date;
    endsAt?: Date;
  } = {},
) {
  return Booking.reconstruct({
    organizationId: ORGANIZATION_ID,
    bookingId: overrides.bookingId ?? "booking-1",
    customerId: "customer-1",
    consultantId: "consultant-1",
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt: overrides.startsAt ?? STARTS_AT,
    endsAt: overrides.endsAt ?? ENDS_AT,
    durationMinutes: 30,
    status: BookingStatus.reconstruct(overrides.status ?? "confirmed"),
    cancelDeadlineAt: CancelDeadline.reconstruct(
      new Date("2026-04-30T10:00:00.000Z"),
    ),
    joinUrl: ZoomUrl.reconstruct("https://zoom.us/j/123"),
    consultantMemo: ConsultantMemo.empty(),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

function createSession(
  rooms: Array<{
    bookingId: string;
    startsAt?: Date;
    endsAt?: Date;
    customerEmail?: string;
  }>,
) {
  const session = ZoomSession.reconstruct({
    organizationId: ORGANIZATION_ID,
    sessionId: "session-1",
    sessionDate: SESSION_DATE,
    zoomMeetingId: "12345",
    joinUrl: "https://zoom.us/j/12345",
    breakoutRooms: [],
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
  });
  for (const room of rooms) {
    session.assignBooking({
      bookingId: room.bookingId,
      consultantId: "consultant-1",
      consultantName: "佐藤相談員",
      startsAt: room.startsAt ?? STARTS_AT,
      endsAt: room.endsAt ?? ENDS_AT,
      customerEmail: room.customerEmail ?? "zoom@example.com",
    });
  }
  return session;
}

class InMemoryZoomSessionRepository implements IZoomSessionRepository {
  constructor(private readonly session: ZoomSession | null) {}

  async findByDate(): Promise<ZoomSession | null> {
    return this.session;
  }

  async save(): Promise<void> {}
}

class InMemoryBookingRepository implements IBookingRepository {
  constructor(private readonly bookings: Booking[]) {}

  async findById(
    _organizationId: string,
    bookingId: string,
  ): Promise<Booking | null> {
    return this.bookings.find((b) => b.getBookingId() === bookingId) ?? null;
  }

  async findByConsultantId(): Promise<Booking[]> {
    return this.bookings;
  }
  async findByCustomerId(): Promise<Booking[]> {
    return this.bookings;
  }
  async findAllByCustomerId(): Promise<Booking[]> {
    return this.bookings;
  }
  async findAllByCustomerIds(): Promise<Booking[]> {
    return this.bookings;
  }
  async findByStatus(): Promise<Booking[]> {
    return this.bookings;
  }
  async findConsultationReminderTargets(): Promise<Booking[]> {
    return this.bookings;
  }
  async findAll(): Promise<Booking[]> {
    return this.bookings;
  }
  async save(): Promise<void> {}
  async saveInTx(): Promise<void> {}
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customers: Customer[]) {}

  async findById(
    _organizationId: string,
    customerId: string,
  ): Promise<Customer | null> {
    return this.customers.find((c) => c.getCustomerId() === customerId) ?? null;
  }
  async findByIds(): Promise<Customer[]> {
    return this.customers;
  }
  async findByEmail(): Promise<Customer | null> {
    return this.customers[0] ?? null;
  }
  async findAll(): Promise<Customer[]> {
    return this.customers;
  }
  async findByEmailAcrossOrganizations(): Promise<Customer[]> {
    return this.customers;
  }
  async findByUserId(): Promise<Customer[]> {
    return this.customers;
  }
  async findByUserIdAndOrganizationId(): Promise<Customer | null> {
    return this.customers[0] ?? null;
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
  async findAllActive(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async findAll(): Promise<Consultant[]> {
    return this.consultant ? [this.consultant] : [];
  }
  async findOrganizationIdsByConsultantId(): Promise<string[]> {
    return [];
  }
  async findByConsultantId(): Promise<Consultant[]> {
    return [];
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

function createUseCase(params: {
  session: ZoomSession | null;
  bookings?: Booking[];
  customers?: Customer[];
  consultant?: Consultant | null;
}) {
  return new GetZoomSessionUseCase(
    new InMemoryZoomSessionRepository(params.session),
    new InMemoryBookingRepository(params.bookings ?? []),
    new InMemoryCustomerRepository(params.customers ?? []),
    new InMemoryConsultantRepository(
      params.consultant === undefined
        ? Consultant.create({
            organizationId: ORGANIZATION_ID,
            consultantId: "consultant-1",
            profile: ConsultantProfile.create("佐藤相談員", "", []),
            statusId: "standard",
          })
        : params.consultant,
    ),
  );
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

describe("GetZoomSessionUseCase", () => {
  it("セッションが無い日は空のルーム一覧を返す", async () => {
    const useCase = createUseCase({ session: null });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      sessionDate: SESSION_DATE,
    });

    expect(result).toEqual({
      sessionDate: SESSION_DATE,
      zoomMeetingId: null,
      joinUrl: null,
      breakoutRooms: [],
    });
  });

  it("ルームに予約・顧客・相談員の情報を結合して返す", async () => {
    const useCase = createUseCase({
      session: createSession([{ bookingId: "booking-1" }]),
      bookings: [createBooking()],
      customers: [createCustomer()],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      sessionDate: SESSION_DATE,
    });

    expect(result.zoomMeetingId).toBe("12345");
    expect(result.breakoutRooms).toHaveLength(1);
    expect(result.breakoutRooms[0]).toMatchObject({
      bookingId: "booking-1",
      roomName: "佐藤相談員 19:00-19:30",
      consultantName: "佐藤相談員",
      customerId: "customer-1",
      customerName: "山田太郎",
      customerEmail: "zoom@example.com",
      bookingStatus: "confirmed",
      isStale: false,
    });
  });

  it("予約が見つからないルームは isStale で返す", async () => {
    const useCase = createUseCase({
      session: createSession([{ bookingId: "booking-missing" }]),
      bookings: [],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      sessionDate: SESSION_DATE,
    });

    expect(result.breakoutRooms[0]).toMatchObject({
      bookingId: "booking-missing",
      bookingStatus: null,
      customerName: null,
      isStale: true,
    });
  });

  it("キャンセル済みの予約が残っているルームも isStale で返す", async () => {
    const useCase = createUseCase({
      session: createSession([{ bookingId: "booking-1" }]),
      bookings: [createBooking({ status: "cancelled" })],
      customers: [createCustomer()],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      sessionDate: SESSION_DATE,
    });

    expect(result.breakoutRooms[0]).toMatchObject({
      bookingStatus: "cancelled",
      isStale: true,
    });
  });

  it("開始時刻の昇順で並ぶ", async () => {
    const later = new Date("2026-05-01T12:00:00.000Z");
    const useCase = createUseCase({
      session: createSession([
        {
          bookingId: "booking-late",
          startsAt: later,
          endsAt: new Date(later.getTime() + 30 * 60 * 1000),
        },
        { bookingId: "booking-1" },
      ]),
      bookings: [
        createBooking({
          bookingId: "booking-late",
          startsAt: later,
          endsAt: new Date(later.getTime() + 30 * 60 * 1000),
        }),
        createBooking(),
      ],
      customers: [createCustomer()],
    });

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      sessionDate: SESSION_DATE,
    });

    expect(result.breakoutRooms.map((r) => r.bookingId)).toEqual([
      "booking-1",
      "booking-late",
    ]);
  });
});
