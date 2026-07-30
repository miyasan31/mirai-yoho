import { resolveRatableUntil } from "@/application/booking-rating/rating-eligibility";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IBookingRatingRepository } from "@/domain/booking-rating/booking-rating-repository";
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
  isRated: boolean;
  /** 評価の受付期限。評価対象になり得ない予約（pending / cancelled）は null */
  ratableUntil: Date | null;
}

export class ListCustomerBookingsUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly bookingRatingRepository: IBookingRatingRepository,
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

    const customerIds = scopedCustomers.map((customer) =>
      customer.getCustomerId(),
    );
    const bookings =
      await this.bookingRepository.findAllByCustomerIds(customerIds);

    const consultantIdsByOrganization = new Map<string, Set<string>>();
    for (const booking of bookings) {
      const orgId = booking.getOrganizationId();
      const set = consultantIdsByOrganization.get(orgId) ?? new Set<string>();
      set.add(booking.getConsultantId());
      consultantIdsByOrganization.set(orgId, set);
    }

    const uniqueOrganizationIds = [...consultantIdsByOrganization.keys()];
    const [organizations, consultantsByOrg, ratings] = await Promise.all([
      this.organizationRepository.findByIds(uniqueOrganizationIds),
      Promise.all(
        [...consultantIdsByOrganization.entries()].map(
          async ([orgId, consultantIdSet]) =>
            [
              orgId,
              await this.consultantRepository.findByIds(orgId, [
                ...consultantIdSet,
              ]),
            ] as const,
        ),
      ),
      // 未評価バッジ用。Doc ID = bookingId なので 1 回の一括取得で済む
      this.bookingRatingRepository.findByBookingIds(
        bookings.map((booking) => booking.getBookingId()),
      ),
    ]);

    const ratedBookingIds = new Set(
      ratings.map((rating) => rating.getBookingId()),
    );

    const consultantNameByKey = new Map<string, string | null>();
    for (const [orgId, consultants] of consultantsByOrg) {
      for (const consultant of consultants) {
        consultantNameByKey.set(
          `${orgId}::${consultant.getConsultantId()}`,
          consultant.getProfile().getDisplayName(),
        );
      }
    }

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
      isRated: ratedBookingIds.has(booking.getBookingId()),
      ratableUntil: resolveRatableUntil(booking),
    }));
  }
}
