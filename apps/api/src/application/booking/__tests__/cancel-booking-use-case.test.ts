import { CancelBookingUseCase } from "@/application/booking/cancel-booking-use-case";
import type { IEmailService } from "@/application/shared/email-service";
import type { IStripeService } from "@/application/shared/stripe-service";
import type { IUserContactService } from "@/application/shared/user-contact-service";
import type { IZoomService } from "@/application/shared/zoom-service";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import { Customer } from "@/domain/customer/customer";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IPaymentRepository } from "@/domain/payment/payment-repository";
import type { ISlotRepository } from "@/domain/slot/slot-repository";
import type { IUserCouponRepository } from "@/domain/user-coupon/user-coupon-repository";
import type { IZoomSessionRepository } from "@/domain/zoom-session/zoom-session-repository";

const ORGANIZATION_ID = "org-1";
const BOOKING_ID = "booking-1";
const CUSTOMER_ID = "customer-1";
const CONSULTANT_ID = "consultant-1";

function createBooking(): Booking {
  // キャンセル期限内に収まるよう、開始は十分先に置く
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    consultantId: CONSULTANT_ID,
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt,
    endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.empty(),
    pricePlanId: "plan-1",
    pricePlanName: "30分プラン",
    pricePlanTotalJPY: 5000,
    agreedTermsVersion: "1.0.0",
    agreedCancellationPolicyVersion: "1.0.0",
    agreedAt: new Date(),
  });
}

function createCustomer(): Customer {
  return Customer.create({
    organizationId: ORGANIZATION_ID,
    customerId: CUSTOMER_ID,
    userId: "user-1",
    name: "山田 太郎",
    email: "taro@example.com",
    phone: "09000000000",
    birthDate: "1990-01-01",
  });
}

function createConsultant(): Consultant {
  return Consultant.create({
    organizationId: ORGANIZATION_ID,
    consultantId: CONSULTANT_ID,
    profile: ConsultantProfile.create("鈴木 花子", "", []),
    statusId: "standard",
  });
}

interface Deps {
  customer: Customer | null;
  consultant: Consultant | null;
  /** 占い師の Firebase Auth メールアドレス。null なら引けなかった扱い */
  consultantEmail?: string | null;
}

function createUseCase({
  customer,
  consultant,
  consultantEmail = "uranai@example.com",
}: Deps) {
  const booking = createBooking();

  const bookingRepository = {
    findById: vi.fn().mockResolvedValue(booking),
    findByConsultantId: vi.fn().mockResolvedValue([]),
    findByCustomerId: vi.fn().mockResolvedValue([]),
    findAllByCustomerId: vi.fn().mockResolvedValue([]),
    findAllByCustomerIds: vi.fn().mockResolvedValue([]),
    findByStatus: vi.fn().mockResolvedValue([]),
    findConsultationReminderTargets: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    saveInTx: vi.fn().mockResolvedValue(undefined),
  } satisfies IBookingRepository;

  const paymentRepository = {
    findByBookingId: vi.fn().mockResolvedValue(null),
    findByPaymentIntentId: vi.fn().mockResolvedValue(null),
    findBySetupIntentId: vi.fn().mockResolvedValue(null),
    findByCustomerId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as IPaymentRepository;

  const slotRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByIdsInTx: vi.fn().mockResolvedValue([]),
    findByOrganizationId: vi.fn().mockResolvedValue([]),
    findByConsultantId: vi.fn().mockResolvedValue([]),
    findAvailableByConsultantId: vi.fn().mockResolvedValue([]),
    findAvailableByTimeRange: vi.fn().mockResolvedValue([]),
    findAvailableChainByConsultant: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    saveInTx: vi.fn().mockResolvedValue(undefined),
  } satisfies ISlotRepository;

  const stripeService = {
    createSetupIntent: vi.fn(),
    createPaymentIntent: vi.fn(),
    createOffSessionPaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    refundPaymentIntent: vi.fn(),
  } as unknown as IStripeService;

  const emailService = {
    sendBookingConfirmation: vi.fn(),
    sendBookingCancellation: vi.fn().mockResolvedValue(undefined),
    sendPaymentReceipt: vi.fn(),
    sendConsultationReminder: vi.fn(),
    sendConsultantBookingNotice: vi.fn(),
    sendConsultantCancellationNotice: vi.fn().mockResolvedValue(undefined),
    sendBatchChargeReport: vi.fn(),
    sendInvitation: vi.fn(),
    sendPasswordReset: vi.fn(),
  } satisfies IEmailService;

  const zoomSessionRepository = {
    findByDate: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies IZoomSessionRepository;

  const zoomService = {
    createDailyMeeting: vi.fn(),
    updateBreakoutRooms: vi.fn().mockResolvedValue(undefined),
  } satisfies IZoomService;

  const userCouponRepository = {
    findById: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue([]),
    findByUserIdAndCouponId: vi.fn().mockResolvedValue([]),
    findRedeemableByUserId: vi.fn().mockResolvedValue([]),
    countByCouponId: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(undefined),
    saveMany: vi.fn().mockResolvedValue(undefined),
  } satisfies IUserCouponRepository;

  const customerRepository = {
    findById: vi.fn().mockResolvedValue(customer),
    findByIds: vi.fn().mockResolvedValue([]),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByEmailAcrossOrganizations: vi.fn().mockResolvedValue([]),
    findByUserId: vi.fn().mockResolvedValue([]),
    findByUserIdAndOrganizationId: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies ICustomerRepository;

  const consultantRepository = {
    findById: vi.fn().mockResolvedValue(consultant),
    findByIds: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    findAllActive: vi.fn().mockResolvedValue([]),
    findOrganizationIdsByConsultantId: vi.fn().mockResolvedValue([]),
    findByConsultantId: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies IConsultantRepository;

  const userContactService = {
    findByUids: vi
      .fn()
      .mockResolvedValue(
        consultantEmail
          ? new Map([
              [
                CONSULTANT_ID,
                { authUid: CONSULTANT_ID, email: consultantEmail },
              ],
            ])
          : new Map(),
      ),
  } satisfies IUserContactService;

  const useCase = new CancelBookingUseCase(
    bookingRepository,
    paymentRepository,
    slotRepository,
    stripeService,
    emailService,
    zoomSessionRepository,
    zoomService,
    userCouponRepository,
    customerRepository,
    consultantRepository,
    userContactService,
  );

  return { useCase, emailService, booking };
}

describe("CancelBookingUseCase", () => {
  it("顧客の実際のメールアドレス・氏名・占い師名でキャンセル確認メールを送る", async () => {
    const { useCase, emailService } = createUseCase({
      customer: createCustomer(),
      consultant: createConsultant(),
    });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });

    expect(emailService.sendBookingCancellation).toHaveBeenCalledTimes(1);
    expect(emailService.sendBookingCancellation).toHaveBeenCalledWith({
      customerEmail: "taro@example.com",
      customerName: "山田 太郎",
      consultantName: "鈴木 花子",
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });
  });

  it("退会済み顧客（メールアドレスが空）にはメールを送らない", async () => {
    const customer = createCustomer();
    customer.mask(new Date());
    const { useCase, emailService } = createUseCase({
      customer,
      consultant: createConsultant(),
    });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "admin",
    });

    expect(emailService.sendBookingCancellation).not.toHaveBeenCalled();
  });

  it("担当占い師にもキャンセル通知を送る", async () => {
    const { useCase, emailService } = createUseCase({
      customer: createCustomer(),
      consultant: createConsultant(),
    });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "admin",
    });

    expect(emailService.sendConsultantCancellationNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        consultantEmail: "uranai@example.com",
        consultantName: "鈴木 花子",
        customerName: "山田 太郎",
        bookingId: BOOKING_ID,
        cancelledBy: "admin",
      }),
    );
  });

  it("占い師のメールアドレスが引けないときは占い師通知を送らない", async () => {
    const { useCase, emailService } = createUseCase({
      customer: createCustomer(),
      consultant: createConsultant(),
      consultantEmail: null,
    });

    await useCase.execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      cancelledBy: "customer",
    });

    expect(
      emailService.sendConsultantCancellationNotice,
    ).not.toHaveBeenCalled();
    // 顧客宛は送られる
    expect(emailService.sendBookingCancellation).toHaveBeenCalledTimes(1);
  });

  it("メール送信が失敗してもキャンセル自体は成功させる", async () => {
    const { useCase, emailService, booking } = createUseCase({
      customer: createCustomer(),
      consultant: createConsultant(),
    });
    vi.mocked(emailService.sendBookingCancellation).mockRejectedValue(
      new Error("resend down"),
    );

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        cancelledBy: "customer",
      }),
    ).resolves.toBeUndefined();

    expect(booking.getStatus().getValue()).toBe("cancelled");
  });
});
