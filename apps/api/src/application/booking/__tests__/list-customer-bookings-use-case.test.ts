import { describe, expect, it } from "vitest";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { ListCustomerBookingsUseCase } from "../list-customer-bookings-use-case";

class InMemoryBookingRepository implements IBookingRepository {
  constructor(private readonly bookings: Booking[]) {}
  async findById(): Promise<Booking | null> {
    return null;
  }
  async findByConsultantId(): Promise<Booking[]> {
    return [];
  }
  async findByCustomerId(): Promise<Booking[]> {
    return [];
  }
  async findAllByCustomerId(customerId: string): Promise<Booking[]> {
    return this.bookings.filter((b) => b.getCustomerId() === customerId);
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
}

class InMemoryCustomerRepository implements ICustomerRepository {
  constructor(private readonly customers: Customer[]) {}
  async findById(): Promise<Customer | null> {
    return null;
  }
  async findByIds(): Promise<Customer[]> {
    return [];
  }
  async findByEmail(): Promise<Customer | null> {
    return null;
  }
  async findByEmailAcrossOrganizations(): Promise<Customer[]> {
    return [];
  }
  async findByUserId(userId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.getUserId() === userId);
  }
  async findByUserIdAndOrganizationId(): Promise<Customer | null> {
    return null;
  }
  async findAll(): Promise<Customer[]> {
    return [];
  }
  async save(): Promise<void> {}
}

class InMemoryConsultantRepository implements IConsultantRepository {
  constructor(private readonly consultants: Consultant[]) {}
  async findById(
    organizationId: string,
    consultantId: string,
  ): Promise<Consultant | null> {
    return (
      this.consultants.find(
        (c) =>
          c.getOrganizationId() === organizationId &&
          c.getConsultantId() === consultantId,
      ) ?? null
    );
  }
  async findAll(): Promise<Consultant[]> {
    return [];
  }
  async findAllActive(): Promise<Consultant[]> {
    return [];
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

function createCustomer(
  organizationId: string,
  customerId: string,
  userId: string,
) {
  return Customer.create({
    organizationId,
    customerId,
    name: "山田太郎",
    email: `${customerId}@example.com`,
    phone: "080-0000-0000",
    birthDate: "1990-01-01",
    userId,
  });
}

function createBooking(
  organizationId: string,
  customerId: string,
  consultantId: string,
  bookingId: string,
) {
  return Booking.create({
    organizationId,
    bookingId,
    customerId,
    consultantId,
    slotId: `${bookingId}-slot`,
    startsAt: new Date("2026-05-01T10:00:00.000Z"),
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

function createConsultant(
  organizationId: string,
  consultantId: string,
  name: string,
) {
  return Consultant.create({
    organizationId,
    consultantId,
    profile: ConsultantProfile.create(name, "", []),
    statusId: "standard",
  });
}

describe("ListCustomerBookingsUseCase", () => {
  it("複数組織にまたがる顧客の予約をマージして返す", async () => {
    const userId = "user-1";
    const customers = [
      createCustomer("org-a", "customer-a", userId),
      createCustomer("org-b", "customer-b", userId),
    ];
    const bookings = [
      createBooking("org-a", "customer-a", "consultant-a", "booking-1"),
      createBooking("org-b", "customer-b", "consultant-b", "booking-2"),
    ];
    const consultants = [
      createConsultant("org-a", "consultant-a", "相談員A"),
      createConsultant("org-b", "consultant-b", "相談員B"),
    ];

    const useCase = new ListCustomerBookingsUseCase(
      new InMemoryBookingRepository(bookings),
      new InMemoryCustomerRepository(customers),
      new InMemoryConsultantRepository(consultants),
    );

    const results = await useCase.execute({ userId });

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.booking.getBookingId()).sort()).toEqual([
      "booking-1",
      "booking-2",
    ]);
    const nameByBookingId = new Map(
      results.map((r) => [r.booking.getBookingId(), r.consultantName]),
    );
    expect(nameByBookingId.get("booking-1")).toBe("相談員A");
    expect(nameByBookingId.get("booking-2")).toBe("相談員B");
  });

  it("scope.organizationId 指定時は該当組織のみを返す", async () => {
    const userId = "user-1";
    const customers = [
      createCustomer("org-a", "customer-a", userId),
      createCustomer("org-b", "customer-b", userId),
    ];
    const bookings = [
      createBooking("org-a", "customer-a", "consultant-a", "booking-1"),
      createBooking("org-b", "customer-b", "consultant-b", "booking-2"),
    ];
    const useCase = new ListCustomerBookingsUseCase(
      new InMemoryBookingRepository(bookings),
      new InMemoryCustomerRepository(customers),
      new InMemoryConsultantRepository([]),
    );

    const results = await useCase.execute({
      userId,
      scope: { organizationId: "org-a" },
    });

    expect(results).toHaveLength(1);
    expect(results[0].booking.getBookingId()).toBe("booking-1");
  });

  it("customer が無い user では空を返す", async () => {
    const useCase = new ListCustomerBookingsUseCase(
      new InMemoryBookingRepository([]),
      new InMemoryCustomerRepository([]),
      new InMemoryConsultantRepository([]),
    );

    const results = await useCase.execute({ userId: "unknown" });

    expect(results).toEqual([]);
  });

  it("相談員が見つからない場合は consultantName は null", async () => {
    const userId = "user-1";
    const customers = [createCustomer("org-a", "customer-a", userId)];
    const bookings = [
      createBooking("org-a", "customer-a", "gone-consultant", "booking-1"),
    ];
    const useCase = new ListCustomerBookingsUseCase(
      new InMemoryBookingRepository(bookings),
      new InMemoryCustomerRepository(customers),
      new InMemoryConsultantRepository([]),
    );

    const results = await useCase.execute({ userId });

    expect(results).toHaveLength(1);
    expect(results[0].consultantName).toBeNull();
  });
});
