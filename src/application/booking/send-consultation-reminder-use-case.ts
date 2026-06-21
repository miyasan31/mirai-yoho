import type { IEmailService } from "@/application/shared/email-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";

const CONSULTATION_REMINDER_WINDOW_MINUTES = 15;

interface SendConsultationReminderResult {
  sentCount: number;
  skippedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export class SendConsultationReminderUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly clientRepository: IClientRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    organizationId: string,
  ): Promise<SendConsultationReminderResult> {
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + CONSULTATION_REMINDER_WINDOW_MINUTES * 60 * 1000,
    );
    const targetBookings =
      await this.bookingRepository.findConsultationReminderTargets(
        organizationId,
        now,
        windowEnd,
      );

    let sentCount = 0;
    let skippedCount = 0;
    const errors: Array<{ bookingId: string; error: string }> = [];

    for (const booking of targetBookings) {
      try {
        const zoomUrl = booking.getZoomUrl()?.getValue();
        if (!zoomUrl) {
          throw new Error("Zoom URL not found");
        }

        const [client, consultant] = await Promise.all([
          this.clientRepository.findById(organizationId, booking.getClientId()),
          this.consultantRepository.findById(
            organizationId,
            booking.getConsultantId(),
          ),
        ]);

        if (!client) {
          throw new Error("Client not found");
        }
        if (!consultant) {
          throw new Error("Consultant not found");
        }

        await this.emailService.sendConsultationReminder({
          clientEmail: client.getEmail(),
          clientName: client.getName(),
          consultantName: consultant.getProfile().getDisplayName(),
          zoomUrl,
          startDatetime: booking.getStartDatetime(),
          bookingId: booking.getBookingId(),
        });

        booking.markConsultationReminderEmailSent(new Date());
        await this.bookingRepository.save(booking);
        sentCount++;
      } catch (error) {
        skippedCount++;
        errors.push({
          bookingId: booking.getBookingId(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { sentCount, skippedCount, errors };
  }
}
