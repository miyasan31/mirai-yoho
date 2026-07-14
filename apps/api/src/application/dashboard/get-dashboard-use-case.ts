import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";

interface GetDashboardInput {
  organizationId: string;
}

interface GetDashboardOutput {
  organizationId: string;
  totalBookings: number;
  totalPayments: number;
  totalCustomers: number;
  totalConsultants: number;
  totalRevenue: number;
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

export class GetDashboardUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
  ) {}

  async execute(input: GetDashboardInput): Promise<GetDashboardOutput> {
    const { organizationId } = input;
    const [bookings, payments, customers, consultants] = await Promise.all([
      this.bookingRepository.findAll(organizationId),
      this.paymentRepository.findAll(organizationId),
      this.customerRepository.findAll(organizationId),
      this.consultantRepository.findAllActive(organizationId),
    ]);

    const totalRevenue = payments
      .filter((payment) => payment.getStatus().getValue() === "charged")
      .reduce((sum, payment) => sum + payment.getMoney().getTotalJPY(), 0);

    return {
      organizationId,
      totalBookings: bookings.length,
      totalPayments: payments.length,
      totalCustomers: customers.length,
      totalConsultants: consultants.length,
      totalRevenue,
      bookingsByStatus: {
        pending: bookings.filter((b) => b.getStatus().getValue() === "pending")
          .length,
        confirmed: bookings.filter(
          (b) => b.getStatus().getValue() === "confirmed",
        ).length,
        completed: bookings.filter(
          (b) => b.getStatus().getValue() === "completed",
        ).length,
        cancelled: bookings.filter(
          (b) => b.getStatus().getValue() === "cancelled",
        ).length,
      },
    };
  }
}
