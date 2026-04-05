import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IZoomService } from "@/application/shared/zoom-service";
import { Booking } from "@/domain/booking/booking";
import type { BookingConfirmedEvent } from "@/domain/booking/booking-events";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import { Client } from "@/domain/client/client";
import type { IClientRepository } from "@/domain/client/client-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";

interface CreateBookingInput {
  slotId?: string;
  startDatetime?: Date;
  endDatetime?: Date;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  consultationContent?: string;
}

interface CreateBookingOutput {
  bookingId: string;
  zoomUrl: string;
}

function toSessionDate(date: Date): string {
  return date
    .toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

function toBreakoutRoomParams(
  session: ZoomDailySession,
): Array<{ name: string; participants: string[] }> {
  return session.getBreakoutRooms().map((r) => ({
    name: r.getRoomName(),
    participants: [...r.getParticipantEmails()],
  }));
}

export class CreateBookingUseCase {
  constructor(
    private readonly slotRepository: ISlotRepository,
    private readonly clientRepository: IClientRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly zoomService: IZoomService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailService: IEmailService,
    private readonly zoomDailySessionRepository: IZoomDailySessionRepository,
    private readonly consultantRepository: IConsultantRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    const slot = await this.resolveSlot(input);

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

    const consultant = await this.consultantRepository.findById(
      slot.getConsultantId(),
    );
    if (!consultant) {
      throw new Error("Consultant not found");
    }
    const consultantName = consultant.getProfile().getDisplayName();

    const sessionDate = toSessionDate(slot.getTimeRange().getStartAt());
    const existingSession =
      await this.zoomDailySessionRepository.findByDate(sessionDate);

    let session: ZoomDailySession;

    if (existingSession) {
      session = existingSession;
      session.assignParticipant(
        slot.getConsultantId(),
        consultantName,
        input.clientEmail,
      );
      await this.zoomService.updateBreakoutRooms({
        meetingId: session.getZoomMeetingId(),
        breakoutRooms: toBreakoutRoomParams(session),
      });
    } else {
      session = ZoomDailySession.create({
        sessionId: crypto.randomUUID(),
        sessionDate,
      });
      session.assignParticipant(
        slot.getConsultantId(),
        consultantName,
        input.clientEmail,
      );
      const { meetingId, joinUrl } = await this.zoomService.createDailyMeeting({
        sessionDate,
        breakoutRooms: toBreakoutRoomParams(session),
      });
      session.setMeetingDetails(meetingId, joinUrl);
    }

    const zoomUrl = ZoomUrl.create(session.getJoinUrl());
    booking.confirm(zoomUrl);

    await this.unitOfWork.runInTransaction(async () => {
      await this.clientRepository.save(client);
      await this.slotRepository.save(slot);
      await this.bookingRepository.save(booking);
      await this.zoomDailySessionRepository.save(session);
    });

    const events = booking.pullDomainEvents();
    for (const event of events) {
      if (event.eventName === "BookingConfirmed") {
        const e = event as BookingConfirmedEvent;
        await this.emailService.sendBookingConfirmation({
          clientEmail: input.clientEmail,
          clientName: input.clientName,
          consultantName: consultantName,
          zoomUrl: e.payload.zoomUrl,
          startDatetime: e.payload.startDatetime,
          bookingId: e.payload.bookingId,
        });
      }
    }

    return { bookingId, zoomUrl: session.getJoinUrl() };
  }

  private async resolveSlot(input: CreateBookingInput) {
    if (input.slotId) {
      const slot = await this.slotRepository.findById(input.slotId);
      if (!slot) {
        throw new Error("Slot not found");
      }
      return slot;
    }

    if (!input.startDatetime || !input.endDatetime) {
      throw new Error("Booking slot information is required");
    }

    const candidateSlots = await this.slotRepository.findAvailableByTimeRange(
      input.startDatetime,
      input.endDatetime,
    );

    if (candidateSlots.length === 0) {
      throw new Error("Slot is no longer available");
    }

    const dailySlots = await this.slotRepository.findAvailableByDate(
      input.startDatetime,
    );
    const availableCountByConsultant = new Map<string, number>();

    for (const slot of dailySlots) {
      const consultantId = slot.getConsultantId();
      availableCountByConsultant.set(
        consultantId,
        (availableCountByConsultant.get(consultantId) ?? 0) + 1,
      );
    }

    return [...candidateSlots].sort((left, right) => {
      const leftCount =
        availableCountByConsultant.get(left.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;
      const rightCount =
        availableCountByConsultant.get(right.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;

      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }

      return left.getConsultantId().localeCompare(right.getConsultantId());
    })[0];
  }
}
