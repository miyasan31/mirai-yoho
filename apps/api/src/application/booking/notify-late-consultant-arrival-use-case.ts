import type { ILateArrivalAlertService } from "@/application/shared/late-arrival-alert-service";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

interface NotifyLateConsultantArrivalInput {
  organizationId: string;
  now: Date;
}

interface NotifyLateConsultantArrivalResult {
  targetCount: number;
  notifiedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export class NotifyLateConsultantArrivalUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly userContactService: IUserContactService,
    private readonly lateArrivalAlertService: ILateArrivalAlertService,
    private readonly adminAppUrl: string,
  ) {}

  async execute(
    input: NotifyLateConsultantArrivalInput,
  ): Promise<NotifyLateConsultantArrivalResult> {
    const confirmedBookings = await this.bookingRepository.findByStatus(
      input.organizationId,
      "confirmed",
    );

    const targetBookings = confirmedBookings.filter((booking) => {
      return (
        booking.getStartsAt().getTime() <= input.now.getTime() &&
        !booking.getConsultantJoinedAt() &&
        !booking.getLateArrivalAlertSentAt()
      );
    });

    const customerIds = targetBookings.map((booking) =>
      booking.getCustomerId(),
    );
    const consultantIds = targetBookings.map((booking) =>
      booking.getConsultantId(),
    );
    const [customers, userContacts] = await Promise.all([
      this.customerRepository.findByIds(input.organizationId, customerIds),
      this.userContactService.findByUids(consultantIds),
    ]);
    const customerById = new Map(
      customers.map(
        (customer) => [customer.getCustomerId(), customer] as const,
      ),
    );

    let notifiedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of targetBookings) {
      try {
        const consultant = await this.consultantRepository.findById(
          input.organizationId,
          booking.getConsultantId(),
        );
        const customer = customerById.get(booking.getCustomerId()) ?? null;
        const consultantProfile = consultant?.getProfile();
        const userContact = userContacts.get(booking.getConsultantId());

        await this.lateArrivalAlertService.sendLateArrivalAlert({
          organizationId: input.organizationId,
          bookingId: booking.getBookingId(),
          consultantName: consultantProfile?.getDisplayName() ?? "未登録",
          consultantEmail: userContact?.email ?? "未登録",
          consultantPhone: consultantProfile?.getPhone() || "未登録",
          customerName: customer?.getName() ?? "未登録",
          startsAt: booking.getStartsAt(),
          elapsedMinutes: Math.max(
            0,
            Math.floor(
              (input.now.getTime() - booking.getStartsAt().getTime()) / 60_000,
            ),
          ),
          adminBookingsUrl: this.buildAdminBookingsUrl(input.organizationId),
        });

        booking.markLateArrivalAlertSent(input.now);
        await this.bookingRepository.save(booking);
        notifiedCount++;
      } catch (error) {
        errors.push({
          bookingId: booking.getBookingId(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { targetCount: targetBookings.length, notifiedCount, errors };
  }

  private buildAdminBookingsUrl(organizationId: string): string {
    const baseUrl = this.adminAppUrl.replace(/\/$/, "");
    return `${baseUrl}/${organizationId}/admin/bookings`;
  }
}
