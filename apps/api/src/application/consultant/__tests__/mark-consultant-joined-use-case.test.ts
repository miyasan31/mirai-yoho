import { DomainError } from "@mirai-yoho/shared/domain-error";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { MarkConsultantJoinedUseCase } from "../mark-consultant-joined-use-case";

const ORGANIZATION_ID = "org-1";
const CONSULTANT_ID = "consultant-1";
const BOOKING_ID = "booking-1";

function createBooking(startsAt = "2026-05-01T10:00:00.000Z") {
  return Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: BOOKING_ID,
    customerId: "customer-1",
    consultantId: CONSULTANT_ID,
    usageSlotIds: ["slot-1", "slot-2"],
    bufferSlotIds: ["slot-3"],
    startsAt: new Date(startsAt),
    endsAt: new Date(new Date(startsAt).getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

class InMemoryBookingRepository implements IBookingRepository {
  constructor(public booking: Booking | null) {}

  async findById(): Promise<Booking | null> {
    return this.booking;
  }

  async findByConsultantId(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findByCustomerId(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findAllByCustomerId(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findByStatus(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findConsultationReminderTargets(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async findAll(): Promise<Booking[]> {
    return this.booking ? [this.booking] : [];
  }

  async save(booking: Booking): Promise<void> {
    this.booking = booking;
  }
  async saveInTx(booking: Booking): Promise<void> {
    this.booking = booking;
  }
}

describe("MarkConsultantJoinedUseCase", () => {
  it("records consultantJoinedAt for the assigned consultant", async () => {
    const repository = new InMemoryBookingRepository(createBooking());
    const useCase = new MarkConsultantJoinedUseCase(repository);
    const joinedAt = new Date("2026-05-01T09:45:00.000Z");

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
      joinedAt,
    });

    expect(repository.booking?.getConsultantJoinedAt()).toEqual(joinedAt);
    expect(repository.booking?.getUpdatedAt()).toEqual(joinedAt);
  });

  it("throws FORBIDDEN when another consultant tries to record join", async () => {
    const repository = new InMemoryBookingRepository(createBooking());
    const useCase = new MarkConsultantJoinedUseCase(repository);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        consultantId: "consultant-2",
        joinedAt: new Date("2026-05-01T09:45:00.000Z"),
      }),
    ).rejects.toThrow(DomainError);
  });
});
