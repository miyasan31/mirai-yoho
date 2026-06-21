import type { ILateArrivalAlertService } from "@/application/shared/late-arrival-alert-service";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

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
    private readonly clientRepository: IClientRepository,
    private readonly userContactService: IUserContactService,
    private readonly lateArrivalAlertService: ILateArrivalAlertService,
    private readonly appUrl: string,
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
        booking.getStartDatetime().getTime() <= input.now.getTime() &&
        !booking.getConsultantJoinedAt() &&
        !booking.getLateArrivalAlertSentAt()
      );
    });

    const clientIds = targetBookings.map((booking) => booking.getClientId());
    const consultantIds = targetBookings.map((booking) =>
      booking.getConsultantId(),
    );
    const [clients, userContacts] = await Promise.all([
      this.clientRepository.findByIds(input.organizationId, clientIds),
      this.userContactService.findByUids(consultantIds),
    ]);
    const clientById = new Map(
      clients.map((client) => [client.getClientId(), client] as const),
    );

    let notifiedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of targetBookings) {
      try {
        const consultant = await this.consultantRepository.findById(
          input.organizationId,
          booking.getConsultantId(),
        );
        const client = clientById.get(booking.getClientId()) ?? null;
        const consultantProfile = consultant?.getProfile();
        const userContact = userContacts.get(booking.getConsultantId());

        await this.lateArrivalAlertService.sendLateArrivalAlert({
          organizationId: input.organizationId,
          bookingId: booking.getBookingId(),
          consultantName: consultantProfile?.getDisplayName() ?? "未登録",
          consultantEmail: userContact?.email ?? "未登録",
          consultantPhone: consultantProfile?.getPhone() || "未登録",
          clientName: client?.getName() ?? "未登録",
          startDatetime: booking.getStartDatetime(),
          elapsedMinutes: Math.max(
            0,
            Math.floor(
              (input.now.getTime() - booking.getStartDatetime().getTime()) /
                60_000,
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
    const baseUrl = this.appUrl.replace(/\/$/, "");
    return `${baseUrl}/${organizationId}/admin/bookings`;
  }
}
