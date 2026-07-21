import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IOrganizationRepository } from "@/domain/organization/organization-repository";

interface ListCustomerBookingsInput {
  userId: string;
  scope?: { organizationId: string };
}

export interface CustomerBookingResult {
  booking: Booking;
  consultantName: string | null;
  organizationName: string | null;
}

export class ListCustomerBookingsUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(
    input: ListCustomerBookingsInput,
  ): Promise<CustomerBookingResult[]> {
    const customers = await this.customerRepository.findByUserId(input.userId);
    const scopedCustomers = input.scope
      ? customers.filter(
          (customer) =>
            customer.getOrganizationId() === input.scope?.organizationId,
        )
      : customers;

    if (scopedCustomers.length === 0) {
      return [];
    }

    const bookingsPerCustomer = await Promise.all(
      scopedCustomers.map((customer) =>
        this.bookingRepository.findAllByCustomerId(customer.getCustomerId()),
      ),
    );
    const bookings = bookingsPerCustomer.flat();

    const uniqueConsultantKeys = new Map<
      string,
      { organizationId: string; consultantId: string }
    >();
    for (const booking of bookings) {
      const key = `${booking.getOrganizationId()}::${booking.getConsultantId()}`;
      if (!uniqueConsultantKeys.has(key)) {
        uniqueConsultantKeys.set(key, {
          organizationId: booking.getOrganizationId(),
          consultantId: booking.getConsultantId(),
        });
      }
    }

    const consultantEntries = await Promise.all(
      [...uniqueConsultantKeys.entries()].map(
        async ([key, { organizationId, consultantId }]) => {
          const consultant = await this.consultantRepository.findById(
            organizationId,
            consultantId,
          );
          return [
            key,
            consultant?.getProfile().getDisplayName() ?? null,
          ] as const;
        },
      ),
    );
    const consultantNameByKey = new Map(consultantEntries);

    const uniqueOrganizationIds = Array.from(
      new Set(bookings.map((booking) => booking.getOrganizationId())),
    );
    const organizations = await this.organizationRepository.findByIds(
      uniqueOrganizationIds,
    );
    const organizationNameById = new Map(
      organizations.map((org) => [org.getOrganizationId(), org.getName()]),
    );

    return bookings.map((booking) => ({
      booking,
      consultantName:
        consultantNameByKey.get(
          `${booking.getOrganizationId()}::${booking.getConsultantId()}`,
        ) ?? null,
      organizationName:
        organizationNameById.get(booking.getOrganizationId()) ?? null,
    }));
  }
}
