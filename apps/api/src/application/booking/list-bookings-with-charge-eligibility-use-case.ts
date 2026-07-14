import {
  type ChargeEligibility,
  evaluateChargeEligibility,
} from "@/application/booking/charge-eligibility";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface ListBookingsInput {
  organizationId: string;
  scope:
    | { kind: "consultant"; consultantId: string }
    | { kind: "admin"; status?: string | null };
  includeCustomers: boolean;
}

export interface BookingWithChargeEligibility {
  booking: Booking;
  eligibility: ChargeEligibility;
  customer: Customer | null;
}

export class ListBookingsWithChargeEligibilityUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(
    input: ListBookingsInput,
  ): Promise<BookingWithChargeEligibility[]> {
    const bookings = await this.loadBookings(input);
    const payments = await this.paymentRepository.findAll(input.organizationId);
    const paymentByBookingId = new Map(
      payments.map((payment) => [payment.getBookingId(), payment]),
    );

    const customerById = input.includeCustomers
      ? await this.loadCustomerById(input.organizationId, bookings)
      : new Map<string, Customer>();

    return bookings.map((booking) => ({
      booking,
      eligibility: evaluateChargeEligibility({
        booking,
        payment: paymentByBookingId.get(booking.getBookingId()) ?? null,
      }),
      customer: customerById.get(booking.getCustomerId()) ?? null,
    }));
  }

  private async loadBookings(input: ListBookingsInput): Promise<Booking[]> {
    if (input.scope.kind === "consultant") {
      return this.bookingRepository.findByConsultantId(
        input.organizationId,
        input.scope.consultantId,
      );
    }
    if (input.scope.status) {
      return this.bookingRepository.findByStatus(
        input.organizationId,
        input.scope.status,
      );
    }
    return this.bookingRepository.findAll(input.organizationId);
  }

  private async loadCustomerById(
    organizationId: string,
    bookings: Booking[],
  ): Promise<Map<string, Customer>> {
    const uniqueCustomerIds = [
      ...new Set(bookings.map((booking) => booking.getCustomerId())),
    ];
    const customers = await this.customerRepository.findByIds(
      organizationId,
      uniqueCustomerIds,
    );
    return new Map(
      customers.map(
        (customer) => [customer.getCustomerId(), customer] as const,
      ),
    );
  }
}
