import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IZoomService } from "@/application/shared/zoom-service";
import type { IBlockedTimeRepository } from "@/domain/blocked-time/blocked-time-repository";
import { Booking } from "@/domain/booking/booking";
import type { BookingConfirmedEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import { DomainError } from "@/domain/shared/domain-error";
import type { ISlotRepository } from "@/domain/slot/slot-repository";

interface CreateBookingInput {
  slotId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  consultationContent?: string;
}

interface CreateBookingOutput {
  bookingId: string;
  zoomUrl: string;
}

export class CreateBookingUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly clientRepository: IClientRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly zoomService: IZoomService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailService: IEmailService,
    private readonly blockedTimeRepository: IBlockedTimeRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    const blockedTimes = await this.blockedTimeRepository.findByConsultantId(
      slot.getConsultantId(),
    );
    const isBlocked = blockedTimes.some((bt) =>
      slot.getTimeRange().overlaps(bt.getTimeRange()),
    );
    if (isBlocked) {
      throw new DomainError(
        "SLOT_BLOCKED",
        "この時間帯は予約不可に設定されています",
      );
    }

    const bookingId = crypto.randomUUID();
    slot.reserve(bookingId);

    const client = Client.create({
      clientId: crypto.randomUUID(),
      name: input.clientName,
      email: input.clientEmail,
      phone: input.clientPhone,
    });

    const booking = Booking.create({
      bookingId,
      clientId: client.getClientId(),
      consultantId: slot.getConsultantId(),
      slotId: slot.getSlotId(),
      startDatetime: slot.getTimeRange().getStartAt(),
      consultantMemo: ConsultantMemo.create(""),
      consultationContent: input.consultationContent,
    });

    const meetingUrl = await this.zoomService.createMeetingUrl({
      startDatetime: slot.getTimeRange().getStartAt(),
      consultantId: slot.getConsultantId(),
    });

    const zoomUrl = ZoomUrl.create(meetingUrl);
    booking.confirm(zoomUrl);

    await this.unitOfWork.runInTransaction(async () => {
      await this.clientRepository.save(client);
      await this.slotRepository.save(slot);
      await this.bookingRepository.save(booking);
    });

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingConfirmed") {
        const e = event as BookingConfirmedEvent;
        await this.emailService.sendBookingConfirmation({
          clientEmail: input.clientEmail,
          clientName: input.clientName,
          consultantName: slot.getConsultantId(),
          zoomUrl: e.payload.zoomUrl,
          startDatetime: e.payload.startDatetime,
          bookingId: e.payload.bookingId,
        });
      }
    }

    return { bookingId, zoomUrl: meetingUrl };
  }
}
