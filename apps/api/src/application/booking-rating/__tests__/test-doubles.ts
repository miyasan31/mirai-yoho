import type { Booking } from "@/domain/booking/booking";
import { Booking as BookingEntity } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import {
  BookingStatus,
  type BookingStatusValue,
} from "@/domain/booking/booking-status";
import { CancelDeadline } from "@/domain/booking/cancel-deadline";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { Organization } from "@/domain/organization/organization";
import type { IOrganizationRepository } from "@/domain/organization/organization-repository";

export const STARTS_AT = new Date("2026-05-01T10:00:00.000Z");
export const ENDS_AT = new Date("2026-05-01T10:30:00.000Z");
/** ENDS_AT + 30日 */
export const RATING_EXPIRES_AT = new Date("2026-05-31T10:30:00.000Z");

export function createBooking(params: {
  bookingId: string;
  status: BookingStatusValue;
  organizationId?: string;
  customerId?: string;
  consultantId?: string;
}): Booking {
  return BookingEntity.reconstruct({
    organizationId: params.organizationId ?? "org-1",
    bookingId: params.bookingId,
    customerId: params.customerId ?? "customer-1",
    consultantId: params.consultantId ?? "consultant-1",
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    durationMinutes: 30,
    status: BookingStatus.reconstruct(params.status),
    cancelDeadlineAt: CancelDeadline.create(STARTS_AT),
    consultantMemo: ConsultantMemo.empty(),
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

export function createCustomer(params: {
  customerId: string;
  userId: string;
  organizationId?: string;
}): Customer {
  return Customer.create({
    organizationId: params.organizationId ?? "org-1",
    customerId: params.customerId,
    name: "山田太郎",
    email: `${params.customerId}@example.com`,
    phone: "080-0000-0000",
    birthDate: "1990-01-01",
    userId: params.userId,
  });
}

export function createConsultant(params: {
  consultantId: string;
  name: string;
  organizationId?: string;
}): Consultant {
  return Consultant.create({
    organizationId: params.organizationId ?? "org-1",
    consultantId: params.consultantId,
    profile: ConsultantProfile.create(params.name, "", []),
    statusId: "standard",
  });
}

export class InMemoryBookingRepository implements IBookingRepository {
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
  async findAllByCustomerIds(customerIds: string[]): Promise<Booking[]> {
    const ids = new Set(customerIds);
    return this.bookings.filter((b) => ids.has(b.getCustomerId()));
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

export class InMemoryCustomerRepository implements ICustomerRepository {
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

export class InMemoryConsultantRepository implements IConsultantRepository {
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
  async findByIds(
    organizationId: string,
    consultantIds: string[],
  ): Promise<Consultant[]> {
    const ids = new Set(consultantIds);
    return this.consultants.filter(
      (c) =>
        c.getOrganizationId() === organizationId &&
        ids.has(c.getConsultantId()),
    );
  }
  async findAll(): Promise<Consultant[]> {
    return this.consultants;
  }
  async findAllActive(): Promise<Consultant[]> {
    return this.consultants;
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

export class InMemoryOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly organizations: Organization[]) {}
  async findById(organizationId: string): Promise<Organization | null> {
    return (
      this.organizations.find(
        (org) => org.getOrganizationId() === organizationId,
      ) ?? null
    );
  }
  async findByIds(organizationIds: string[]): Promise<Organization[]> {
    const set = new Set(organizationIds);
    return this.organizations.filter((org) => set.has(org.getOrganizationId()));
  }
  async save(): Promise<void> {}
}
