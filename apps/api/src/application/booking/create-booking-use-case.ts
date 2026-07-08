import { DomainError } from "@mirai-yoho/shared/domain-error";
import { AppError } from "@/application/shared/app-error";
import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IZoomService } from "@/application/shared/zoom-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import {
  type ConsultantPricePlan,
  parsePricePlanSelectionId,
} from "@/domain/consultant-price-plan/consultant-price-plan";
import type { IConsultantPricePlanRepository } from "@/domain/consultant-price-plan/consultant-price-plan-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import type { IOrganizationSettingsRepository } from "@/domain/organization-settings/organization-settings-repository";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { IUserRepository } from "@/domain/user/user-repository";
import { ZoomDailySession } from "@/domain/zoom-session/zoom-daily-session";
import type { IZoomDailySessionRepository } from "@/domain/zoom-session/zoom-daily-session-repository";

interface CreateBookingInput {
  organizationId: string;
  userId: string;
  slotId?: string;
  startsAt?: Date;
  endsAt?: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerBirthDate: string;
  consultationContent?: string;
  selectionId: string;
}

interface CreateBookingOutput {
  bookingId: string;
  joinUrl: string;
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
    private readonly customerRepository: ICustomerRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly zoomService: IZoomService,
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailService: IEmailService,
    private readonly zoomDailySessionRepository: IZoomDailySessionRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly consultantPricePlanRepository: IConsultantPricePlanRepository,
    private readonly organizationSettingsRepository: IOrganizationSettingsRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user || !user.isActive()) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found or withdrawn");
    }
    if (!user.hasActiveZoomConnection()) {
      throw new AppError(
        409,
        "ZOOM_NOT_CONNECTED",
        "Zoom connection is required to book a session",
      );
    }
    const zoomEmail = user.getZoomEmail();
    if (!zoomEmail) {
      throw new AppError(
        409,
        "ZOOM_NOT_CONNECTED",
        "Zoom connection is required to book a session",
      );
    }

    const { slot, pricePlan } = await this.resolveSlotAndPricePlan(input);

    const bookingId = crypto.randomUUID();
    slot.reserve(bookingId);

    const existingCustomer =
      await this.customerRepository.findByUserIdAndOrganizationId(
        input.userId,
        input.organizationId,
      );
    const customer =
      existingCustomer ??
      Customer.create({
        organizationId: input.organizationId,
        customerId: crypto.randomUUID(),
        userId: input.userId,
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        birthDate: input.customerBirthDate,
      });

    if (existingCustomer) {
      existingCustomer.updateInfo({
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        birthDate: input.customerBirthDate,
      });
    }

    const booking = Booking.create({
      organizationId: input.organizationId,
      bookingId,
      customerId: customer.getCustomerId(),
      consultantId: slot.getConsultantId(),
      slotId: slot.getSlotId(),
      startsAt: slot.getTimeRange().getStartsAt(),
      consultantMemo: ConsultantMemo.create(""),
      consultationContent: input.consultationContent,
      pricePlanId: pricePlan.getPricePlanId(),
      pricePlanName: pricePlan.getName(),
      pricePlanTotalJPY: pricePlan.getTotalJPY(),
    });

    const consultant = await this.consultantRepository.findById(
      input.organizationId,
      slot.getConsultantId(),
    );
    if (!consultant) {
      throw new DomainError("CONSULTANT_NOT_FOUND", "Consultant not found");
    }
    const consultantName = consultant.getProfile().getDisplayName();

    const sessionDate = toSessionDate(slot.getTimeRange().getStartsAt());
    const existingSession = await this.zoomDailySessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );

    let session: ZoomDailySession;

    try {
      if (existingSession) {
        session = existingSession;
        session.assignParticipant(
          slot.getConsultantId(),
          consultantName,
          zoomEmail,
        );
        await this.zoomService.updateBreakoutRooms({
          meetingId: session.getZoomMeetingId(),
          breakoutRooms: toBreakoutRoomParams(session),
        });
      } else {
        session = ZoomDailySession.create({
          organizationId: input.organizationId,
          sessionId: crypto.randomUUID(),
          sessionDate,
        });
        session.assignParticipant(
          slot.getConsultantId(),
          consultantName,
          zoomEmail,
        );
        const { meetingId, joinUrl } =
          await this.zoomService.createDailyMeeting({
            sessionDate,
            breakoutRooms: toBreakoutRoomParams(session),
          });
        session.setMeetingDetails(meetingId, joinUrl);
      }
    } catch {
      throw new AppError(
        502,
        "ZOOM_INTEGRATION_ERROR",
        "Zoom integration failed. Please try again later.",
      );
    }

    const joinUrl = ZoomUrl.create(session.getJoinUrl());
    booking.confirm(joinUrl);

    try {
      await this.emailService.sendBookingConfirmation({
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        consultantName,
        joinUrl: session.getJoinUrl(),
        startsAt: booking.getStartsAt(),
        bookingId,
      });
    } catch {
      throw new AppError(
        502,
        "EMAIL_DELIVERY_ERROR",
        "Failed to send booking confirmation email. Please try again later.",
      );
    }
    booking.pullDomainEvents();

    await this.unitOfWork.runInTransaction(async () => {
      await this.customerRepository.save(customer);
      await this.slotRepository.save(slot);
      await this.bookingRepository.save(booking);
      await this.zoomDailySessionRepository.save(session);
    });

    return { bookingId, joinUrl: session.getJoinUrl() };
  }

  private async resolveSlotAndPricePlan(
    input: CreateBookingInput,
  ): Promise<{ slot: Slot; pricePlan: ConsultantPricePlan }> {
    const selection = parsePricePlanSelectionId(input.selectionId);
    if (!selection) {
      throw new AppError(
        400,
        "INVALID_PRICE_PLAN_SELECTION",
        "Price plan selection is invalid",
      );
    }
    const settings =
      (await this.organizationSettingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? OrganizationSettings.createDefault(input.organizationId);
    const pricePlanRange = settings.getPricePlanRange();

    if (input.slotId) {
      const slot = await this.slotRepository.findById(
        input.organizationId,
        input.slotId,
      );
      if (!slot) {
        throw new Error("Slot not found");
      }
      const pricePlan = await this.findSelectablePricePlanForConsultant({
        organizationId: input.organizationId,
        consultantId: slot.getConsultantId(),
        normalizedName: selection.normalizedName,
        totalJPY: selection.totalJPY,
      });
      if (!pricePlan || !pricePlanRange.contains(pricePlan.getTotalJPY())) {
        throw new AppError(
          400,
          "PRICE_PLAN_NOT_SELECTABLE",
          "Selected price plan is not selectable",
        );
      }
      return { slot, pricePlan };
    }

    if (!input.startsAt || !input.endsAt) {
      throw new Error("Booking slot information is required");
    }

    const candidateSlots = await this.slotRepository.findAvailableByTimeRange(
      input.organizationId,
      input.startsAt,
      input.endsAt,
    );

    const candidateSlotsWithPricePlans = await Promise.all(
      candidateSlots.map(async (slot) => {
        const pricePlan = await this.findSelectablePricePlanForConsultant({
          organizationId: input.organizationId,
          consultantId: slot.getConsultantId(),
          normalizedName: selection.normalizedName,
          totalJPY: selection.totalJPY,
        });
        if (!pricePlan || !pricePlanRange.contains(pricePlan.getTotalJPY())) {
          return null;
        }
        return { slot, pricePlan };
      }),
    );
    const selectableCandidates = candidateSlotsWithPricePlans.filter(
      (
        candidate,
      ): candidate is { slot: Slot; pricePlan: ConsultantPricePlan } =>
        candidate !== null,
    );

    if (selectableCandidates.length === 0) {
      throw new Error("Slot is no longer available");
    }

    const dailySlots = await this.slotRepository.findAvailableByDate(
      input.organizationId,
      input.startsAt,
    );
    const availableCountByConsultant = new Map<string, number>();

    for (const slot of dailySlots) {
      const consultantId = slot.getConsultantId();
      availableCountByConsultant.set(
        consultantId,
        (availableCountByConsultant.get(consultantId) ?? 0) + 1,
      );
    }

    return [...selectableCandidates].sort((left, right) => {
      const leftCount =
        availableCountByConsultant.get(left.slot.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;
      const rightCount =
        availableCountByConsultant.get(right.slot.getConsultantId()) ??
        Number.MAX_SAFE_INTEGER;

      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }

      return left.slot
        .getConsultantId()
        .localeCompare(right.slot.getConsultantId());
    })[0];
  }

  private async findSelectablePricePlanForConsultant(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    totalJPY: number;
  }): Promise<ConsultantPricePlan | null> {
    const pricePlan =
      await this.consultantPricePlanRepository.findBySignature(params);
    if (!pricePlan || !pricePlan.isActive()) {
      return null;
    }
    return pricePlan;
  }
}
