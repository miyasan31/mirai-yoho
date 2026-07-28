import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  getBufferSlotCount,
  getSlotUnitMs,
  getUsageSlotCount,
  isSupportedDuration,
  type SupportedDurationMinutes,
} from "@mirai-yoho/shared/slot-availability";
import { AppError } from "@/application/shared/app-error";
import type { ICancelTokenService } from "@/application/shared/cancel-token-service";
import type { IEmailService } from "@/application/shared/email-service";
import type { IUnitOfWork } from "@/application/shared/unit-of-work";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { ZoomUrl } from "@/domain/booking/zoom-url";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import { PolicyAgreement } from "@/domain/policy/policy-agreement";
import type { IPolicyAgreementRepository } from "@/domain/policy/policy-agreement-repository";
import type { PolicyRevision } from "@/domain/policy/policy-revision";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";
import {
  type PricePlan,
  parsePricePlanSelectionId,
} from "@/domain/price-plan/price-plan";
import type { IPricePlanRepository } from "@/domain/price-plan/price-plan-repository";
import { Settings } from "@/domain/settings/settings";
import type { ISettingsRepository } from "@/domain/settings/settings-repository";
import type { Slot } from "@/domain/slot/slot";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import { BirthDate } from "@/domain/user/birth-date";
import type { IUserRepository } from "@/domain/user/user-repository";
import type { UserCoupon } from "@/domain/user-coupon/user-coupon";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import { ZoomSession } from "@/domain/zoom-session/zoom-session";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

interface CreateBookingInput {
  organizationId: string;
  userId: string;
  consultantId: string;
  startsAt: Date;
  durationMinutes: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerBirthDate: string;
  consultationContent?: string;
  selectionId: string;
  selectedUserCouponId?: string;
  agreedTermsRevisionId: string;
  agreedCancellationPolicyRevisionId: string;
  agreedAt: Date;
  guardianName?: string;
  guardianConsentedAt?: Date;
}

interface CreateBookingOutput {
  bookingId: string;
  joinUrl: string;
}

interface ResolvedContinuous {
  consultantId: string;
  usageSlots: Slot[];
  bufferSlots: Slot[];
  pricePlan: PricePlan;
}

// Zoom API 呼び出しの失敗のみを ZOOM_INTEGRATION_ERROR に写す。
// 原因を cause として保持し、ログから実際の失敗理由を追えるようにする
async function callZoom<T>(execute: () => Promise<T>): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    throw new AppError(
      502,
      "ZOOM_INTEGRATION_ERROR",
      "Zoom integration failed. Please try again later.",
      { cause: error },
    );
  }
}

function toBreakoutRoomParams(
  session: ZoomSession,
): Array<{ name: string; participants: string[] }> {
  return session.getBreakoutRooms().map((r) => ({
    name: r.getRoomName(),
    participants: [r.getCustomerEmail()],
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
    private readonly zoomSessionRepository: IZoomSessionRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly pricePlanRepository: IPricePlanRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly userRepository: IUserRepository,
    private readonly userCouponRepository: IUserCouponRepository,
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
    private readonly policyAgreementRepository: IPolicyAgreementRepository,
    private readonly cancelTokenService: ICancelTokenService,
    private readonly userContactService: IUserContactService,
    private readonly userAppUrl: string,
  ) {}

  /**
   * 担当占い師へ予約確定を通知する（PRD §3.7）。
   * 予約自体は確定しているため、宛先が引けない・送信に失敗した場合も
   * ログに残して続行する（顧客向け確認メールと違い致命的ではない）。
   */
  private async notifyConsultant(params: {
    consultantId: string;
    consultantName: string;
    customerName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void> {
    try {
      const contacts = await this.userContactService.findByUids([
        params.consultantId,
      ]);
      const consultantEmail = contacts.get(params.consultantId)?.email;
      if (!consultantEmail) {
        console.warn("Skipped consultant booking notice: no email", {
          consultantId: params.consultantId,
          bookingId: params.bookingId,
        });
        return;
      }
      await this.emailService.sendConsultantBookingNotice({
        consultantEmail,
        consultantName: params.consultantName,
        customerName: params.customerName,
        joinUrl: params.joinUrl,
        startsAt: params.startsAt,
        bookingId: params.bookingId,
      });
    } catch (error) {
      console.error("Failed to send consultant booking notice", {
        bookingId: params.bookingId,
        error,
      });
    }
  }

  // 確認メールに載せる署名付きキャンセル URL。トークンはキャンセル期限まで有効。
  private buildCancelUrl(
    organizationId: string,
    bookingId: string,
    cancelDeadlineAt: Date,
  ): string {
    const token = this.cancelTokenService.generateToken(
      bookingId,
      cancelDeadlineAt,
    );
    const baseUrl = this.userAppUrl.replace(/\/$/, "");
    return `${baseUrl}/${organizationId}/booking/cancel?token=${encodeURIComponent(token)}`;
  }

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    if (!isSupportedDuration(input.durationMinutes)) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "durationMinutes must be one of 30, 60, 90, 120",
      );
    }
    const durationMinutes: SupportedDurationMinutes = input.durationMinutes;

    const termsRevision = await this.resolvePublishedRevision(
      input.organizationId,
      "terms",
      input.agreedTermsRevisionId,
    );
    const cancellationRevision = await this.resolvePublishedRevision(
      input.organizationId,
      "cancellation_policy",
      input.agreedCancellationPolicyRevisionId,
    );

    if (BirthDate.isMinor(input.customerBirthDate, new Date())) {
      if (!input.guardianName || !input.guardianConsentedAt) {
        throw new AppError(
          400,
          "GUARDIAN_CONSENT_REQUIRED",
          "guardianName and guardianConsentedAt are required for customers under 18",
        );
      }
    }

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

    const resolved = await this.resolveContinuousAndPricePlan({
      ...input,
      durationMinutes,
    });

    const bookingId = crypto.randomUUID();
    for (const slot of [...resolved.usageSlots, ...resolved.bufferSlots]) {
      slot.reserve(bookingId);
    }

    const appliedCoupon = await this.resolveAppliedCoupon(input);

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
        guardianName: input.guardianName,
        guardianConsentedAt: input.guardianConsentedAt,
      });

    if (existingCustomer) {
      existingCustomer.updateInfo({
        name: input.customerName,
        email: input.customerEmail,
        phone: input.customerPhone,
        birthDate: input.customerBirthDate,
        guardianName: input.guardianName,
        guardianConsentedAt: input.guardianConsentedAt,
      });
    }

    // 予約フォームで入力された最新の情報でユーザープロフィールも更新する
    user.updateProfile({
      displayName: input.customerName,
      primaryEmail: input.customerEmail,
      phoneNumber: input.customerPhone,
      birthDate: BirthDate.create(input.customerBirthDate, new Date()),
    });

    const startsAt = resolved.usageSlots[0].getTimeRange().getStartsAt();
    const endsAt = new Date(
      startsAt.getTime() + resolved.usageSlots.length * getSlotUnitMs(),
    );

    const booking = Booking.create({
      organizationId: input.organizationId,
      bookingId,
      customerId: customer.getCustomerId(),
      consultantId: resolved.consultantId,
      usageSlotIds: resolved.usageSlots.map((s) => s.getSlotId()),
      bufferSlotIds: resolved.bufferSlots.map((s) => s.getSlotId()),
      startsAt,
      endsAt,
      durationMinutes,
      consultantMemo: ConsultantMemo.empty(),
      consultationContent: input.consultationContent,
      pricePlanId: resolved.pricePlan.getPricePlanId(),
      pricePlanName: resolved.pricePlan.getName(),
      pricePlanTotalJPY: resolved.pricePlan.getTotalJPY(),
      appliedCoupon: appliedCoupon
        ? {
            userCouponId: appliedCoupon.getUserCouponId(),
            discountJPY: appliedCoupon.getAmountJPY(),
          }
        : undefined,
      agreedTermsVersion: termsRevision.getVersion(),
      agreedCancellationPolicyVersion: cancellationRevision.getVersion(),
      agreedAt: input.agreedAt,
    });

    const consultant = await this.consultantRepository.findById(
      input.organizationId,
      resolved.consultantId,
    );
    if (!consultant) {
      throw new DomainError("CONSULTANT_NOT_FOUND", "Consultant not found");
    }
    const consultantName = consultant.getProfile().getDisplayName();

    const sessionDate = ZoomSession.sessionDateFromInstant(startsAt);
    const existingSession = await this.zoomSessionRepository.findByDate(
      input.organizationId,
      sessionDate,
    );

    const session =
      existingSession ??
      ZoomSession.create({
        organizationId: input.organizationId,
        sessionId: crypto.randomUUID(),
        sessionDate,
      });
    session.assignBooking({
      bookingId,
      consultantId: resolved.consultantId,
      consultantName,
      startsAt,
      endsAt,
      customerEmail: zoomEmail,
    });

    if (existingSession) {
      await callZoom(() =>
        this.zoomService.updateBreakoutRooms({
          meetingId: session.getZoomMeetingId(),
          breakoutRooms: toBreakoutRoomParams(session),
        }),
      );
    } else {
      const { meetingId, joinUrl } = await callZoom(() =>
        this.zoomService.createDailyMeeting({
          sessionDate,
          breakoutRooms: toBreakoutRoomParams(session),
        }),
      );
      session.setMeetingDetails(meetingId, joinUrl);
    }

    const joinUrl = ZoomUrl.create(session.getJoinUrl());
    booking.confirm(joinUrl);

    if (appliedCoupon) {
      appliedCoupon.redeem(bookingId, new Date());
    }

    try {
      await this.emailService.sendBookingConfirmation({
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        consultantName,
        joinUrl: session.getJoinUrl(),
        startsAt: booking.getStartsAt(),
        bookingId,
        cancelUrl: this.buildCancelUrl(
          input.organizationId,
          bookingId,
          booking.getCancelDeadlineAt().getValue(),
        ),
      });
    } catch {
      throw new AppError(
        502,
        "EMAIL_DELIVERY_ERROR",
        "Failed to send booking confirmation email. Please try again later.",
      );
    }
    booking.pullDomainEvents();

    await this.unitOfWork.runInTransaction(async (tx) => {
      await this.customerRepository.save(customer);
      await this.userRepository.save(user);
      for (const slot of [...resolved.usageSlots, ...resolved.bufferSlots]) {
        await this.slotRepository.saveInTx(slot, tx);
      }
      await this.bookingRepository.saveInTx(booking, tx);
      await this.zoomSessionRepository.save(session);
      if (appliedCoupon) {
        await this.userCouponRepository.save(appliedCoupon);
      }
    });

    await this.notifyConsultant({
      consultantId: resolved.consultantId,
      consultantName,
      customerName: input.customerName,
      joinUrl: session.getJoinUrl(),
      startsAt: booking.getStartsAt(),
      bookingId,
    });

    await this.recordAgreements({
      organizationId: input.organizationId,
      userId: input.userId,
      bookingId,
      agreedAt: input.agreedAt,
      revisions: [termsRevision, cancellationRevision],
    });

    return { bookingId, joinUrl: session.getJoinUrl() };
  }

  private async resolvePublishedRevision(
    organizationId: string,
    type: PolicyType,
    revisionId: string,
  ): Promise<PolicyRevision> {
    const revision = await this.policyRevisionRepository.findById(revisionId);
    if (
      !revision ||
      revision.getOrganizationId() !== organizationId ||
      revision.getType() !== type
    ) {
      throw new AppError(
        404,
        "POLICY_REVISION_NOT_FOUND",
        `Policy revision ${revisionId} not found for type ${type}`,
      );
    }
    if (!revision.isPublished()) {
      throw new AppError(
        400,
        "POLICY_REVISION_NOT_PUBLISHED",
        `Policy revision ${revisionId} is not published`,
      );
    }
    return revision;
  }

  private async recordAgreements(params: {
    organizationId: string;
    userId: string;
    bookingId: string;
    agreedAt: Date;
    revisions: PolicyRevision[];
  }): Promise<void> {
    for (const revision of params.revisions) {
      const agreement = PolicyAgreement.create({
        agreementId: crypto.randomUUID(),
        organizationId: params.organizationId,
        type: revision.getType(),
        subjectType: "user",
        subjectId: params.userId,
        revisionId: revision.getRevisionId(),
        version: revision.getVersion(),
        agreedVia: "booking",
        bookingId: params.bookingId,
        agreedAt: params.agreedAt,
      });
      await this.policyAgreementRepository.save(agreement);
    }
  }

  private async resolveAppliedCoupon(
    input: CreateBookingInput,
  ): Promise<UserCoupon | null> {
    if (!input.selectedUserCouponId) return null;
    const coupon = await this.userCouponRepository.findById(
      input.selectedUserCouponId,
    );
    if (!coupon) {
      throw new AppError(404, "COUPON_NOT_FOUND", "Selected coupon not found");
    }
    if (coupon.getUserId() !== input.userId) {
      throw new AppError(
        403,
        "COUPON_OWNER_MISMATCH",
        "Selected coupon does not belong to this user",
      );
    }
    if (coupon.getOrganizationId() !== input.organizationId) {
      throw new AppError(
        403,
        "COUPON_ORGANIZATION_MISMATCH",
        "Selected coupon does not belong to this organization",
      );
    }
    if (!coupon.isRedeemable(new Date())) {
      throw new AppError(
        409,
        "COUPON_NOT_REDEEMABLE",
        "Selected coupon is not redeemable (already used or expired)",
      );
    }
    return coupon;
  }

  private async resolveContinuousAndPricePlan(
    input: CreateBookingInput & { durationMinutes: SupportedDurationMinutes },
  ): Promise<ResolvedContinuous> {
    const selection = parsePricePlanSelectionId(input.selectionId);
    if (!selection) {
      throw new AppError(
        400,
        "INVALID_PRICE_PLAN_SELECTION",
        "Price plan selection is invalid",
      );
    }
    if (selection.durationMinutes !== input.durationMinutes) {
      throw new AppError(
        400,
        "PRICE_PLAN_DURATION_MISMATCH",
        "Selected plan duration does not match the requested duration",
      );
    }
    const settings =
      (await this.settingsRepository.findByOrganizationId(
        input.organizationId,
      )) ?? Settings.createDefault(input.organizationId);
    const pricePlanRange = settings.getPricePlanRange();

    const usageCount = getUsageSlotCount(input.durationMinutes);
    const bufferCount = getBufferSlotCount();
    const totalRequired = usageCount + bufferCount;

    const chain = await this.slotRepository.findAvailableChainByConsultant(
      input.organizationId,
      input.consultantId,
      input.startsAt,
      totalRequired,
    );
    if (!chain) {
      throw new AppError(
        409,
        "SLOT_NOT_AVAILABLE",
        "Requested time is no longer available",
      );
    }
    const pricePlan = await this.findSelectablePricePlanForConsultant({
      organizationId: input.organizationId,
      consultantId: input.consultantId,
      normalizedName: selection.normalizedName,
      durationMinutes: selection.durationMinutes,
      totalJPY: selection.totalJPY,
    });
    if (!pricePlan || !pricePlanRange.contains(pricePlan.getTotalJPY())) {
      throw new AppError(
        400,
        "PRICE_PLAN_NOT_SELECTABLE",
        "Selected price plan is not selectable",
      );
    }
    return {
      consultantId: input.consultantId,
      usageSlots: chain.slice(0, usageCount),
      bufferSlots: chain.slice(usageCount),
      pricePlan,
    };
  }

  private async findSelectablePricePlanForConsultant(params: {
    organizationId: string;
    consultantId: string;
    normalizedName: string;
    durationMinutes: SupportedDurationMinutes;
    totalJPY: number;
  }): Promise<PricePlan | null> {
    const pricePlan = await this.pricePlanRepository.findBySignature(params);
    if (!pricePlan || !pricePlan.isActive()) {
      return null;
    }
    return pricePlan;
  }
}
