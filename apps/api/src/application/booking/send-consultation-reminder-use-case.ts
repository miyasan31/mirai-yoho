import type { IEmailService } from "@/application/shared/email-service";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";

const CONSULTATION_REMINDER_WINDOW_MINUTES = 15;

interface SendConsultationReminderResult {
  sentCount: number;
  skippedCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

export class SendConsultationReminderUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly customerRepository: ICustomerRepository,
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
        const joinUrl = booking.getJoinUrl()?.getValue();
        if (!joinUrl) {
          throw new Error("Zoom URL not found");
        }

        const [customer, consultant] = await Promise.all([
          this.customerRepository.findById(
            organizationId,
            booking.getCustomerId(),
          ),
          this.consultantRepository.findById(
            organizationId,
            booking.getConsultantId(),
          ),
        ]);

        if (!customer) {
          throw new Error("Customer not found");
        }
        if (!consultant) {
          throw new Error("Consultant not found");
        }

        await this.emailService.sendConsultationReminder({
          customerEmail: customer.getEmail(),
          customerName: customer.getName(),
          consultantName: consultant.getProfile().getDisplayName(),
          joinUrl,
          startsAt: booking.getStartsAt(),
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
