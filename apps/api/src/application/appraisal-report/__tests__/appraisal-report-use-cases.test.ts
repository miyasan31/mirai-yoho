import { DomainError } from "@mirai-yoho/shared/domain-error";
import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/application/shared/app-error";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";
import { ConsultantMemo } from "@/domain/booking/consultant-memo";
import { GetAppraisalReportUseCase } from "../get-appraisal-report-use-case";
import { PublishAppraisalReportUseCase } from "../publish-appraisal-report-use-case";
import { SaveAppraisalReportDraftUseCase } from "../save-appraisal-report-draft-use-case";

const ORGANIZATION_ID = "org-1";
const BOOKING_ID = "booking-1";
const CONSULTANT_ID = "consultant-1";
const CUSTOMER_ID = "customer-1";

const PAST_ENDS_AT = new Date("2020-01-01T10:30:00.000Z");
const FUTURE_ENDS_AT = new Date("2999-01-01T10:30:00.000Z");

function createBooking(options?: { endsAt?: Date; cancelled?: boolean }) {
  const endsAt = options?.endsAt ?? PAST_ENDS_AT;
  const booking = Booking.create({
    organizationId: ORGANIZATION_ID,
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    consultantId: CONSULTANT_ID,
    usageSlotIds: ["slot-1"],
    bufferSlotIds: [],
    startsAt: new Date(endsAt.getTime() - 30 * 60 * 1000),
    endsAt,
    durationMinutes: 30,
    consultantMemo: ConsultantMemo.create({
      customerName: "山田 花子",
      birthDate: "1990-01-01",
      appraisalDate: "2026-07-08",
      freeMemo: "初回鑑定",
    }),
    pricePlanId: "plan-1",
    pricePlanName: "通常鑑定",
    pricePlanTotalJPY: 5500,
    agreedTermsVersion: "2026-08-01",
    agreedCancellationPolicyVersion: "2026-08-01",
    agreedAt: new Date("2019-12-01T00:00:00.000Z"),
  });
  if (options?.cancelled) {
    booking.cancel("admin");
  }
  return booking;
}

class InMemoryBookingRepository implements IBookingRepository {
  constructor(private readonly bookings: Booking[]) {}
  async findById(
    organizationId: string,
    bookingId: string,
  ): Promise<Booking | null> {
    return (
      this.bookings.find(
        (b) =>
          b.getOrganizationId() === organizationId &&
          b.getBookingId() === bookingId,
      ) ?? null
    );
  }
  async findByConsultantId(): Promise<Booking[]> {
    return [];
  }
  async findByCustomerId(): Promise<Booking[]> {
    return [];
  }
  async findAllByCustomerId(): Promise<Booking[]> {
    return [];
  }
  async findAllByCustomerIds(): Promise<Booking[]> {
    return [];
  }
  async findByStatus(): Promise<Booking[]> {
    return [];
  }
  async findConsultationReminderTargets(): Promise<Booking[]> {
    return [];
  }
  async findAll(): Promise<Booking[]> {
    return this.bookings;
  }
  async save(): Promise<void> {}
  async saveInTx(): Promise<void> {}
}

class InMemoryAppraisalReportRepository implements IAppraisalReportRepository {
  reports: AppraisalReport[] = [];

  async findById(
    organizationId: string,
    reportId: string,
  ): Promise<AppraisalReport | null> {
    return (
      this.reports.find(
        (r) =>
          r.getOrganizationId() === organizationId &&
          r.getReportId() === reportId,
      ) ?? null
    );
  }
  async findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<AppraisalReport | null> {
    return (
      this.reports.find(
        (r) =>
          r.getOrganizationId() === organizationId &&
          r.getBookingId() === bookingId,
      ) ?? null
    );
  }
  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<AppraisalReport[]> {
    return this.reports.filter(
      (r) =>
        r.getOrganizationId() === organizationId &&
        r.getConsultantId() === consultantId,
    );
  }
  async findPublishedByCustomerIds(
    customerIds: string[],
  ): Promise<AppraisalReport[]> {
    const ids = new Set(customerIds);
    return this.reports.filter(
      (r) => ids.has(r.getCustomerId()) && r.isPublished(),
    );
  }
  async save(report: AppraisalReport): Promise<void> {
    const index = this.reports.findIndex(
      (r) => r.getReportId() === report.getReportId(),
    );
    if (index >= 0) {
      this.reports[index] = report;
      return;
    }
    this.reports.push(report);
  }
}

const draftInput = {
  organizationId: ORGANIZATION_ID,
  bookingId: BOOKING_ID,
  consultantId: CONSULTANT_ID,
  title: "2026年下半期の運勢",
  customerName: "山田 花子",
  birthDate: "1990-01-01",
  appraisalDate: "2026-07-08",
  theme: "仕事運",
  currentSituation: "転職を検討中",
  result: "秋以降が good タイミング",
  luckyAction: "朝の散歩",
  summary: "焦らず準備を進める",
};

describe("SaveAppraisalReportDraftUseCase", () => {
  let reportRepository: InMemoryAppraisalReportRepository;

  beforeEach(() => {
    reportRepository = new InMemoryAppraisalReportRepository();
  });

  function useCase(booking: Booking) {
    return new SaveAppraisalReportDraftUseCase(
      new InMemoryBookingRepository([booking]),
      reportRepository,
    );
  }

  it("鑑定終了後の予約に下書きを新規作成する", async () => {
    const report = await useCase(createBooking()).execute(draftInput);

    expect(report.getStatus()).toBe("draft");
    expect(report.getCustomerId()).toBe(CUSTOMER_ID);
    expect(report.getContent().getResult()).toBe("秋以降が good タイミング");
    expect(reportRepository.reports).toHaveLength(1);
  });

  it("2 回目の保存は既存の鑑定書を上書きする（予約 1 件につき 1 通）", async () => {
    const booking = createBooking();
    const first = await useCase(booking).execute(draftInput);
    const second = await useCase(booking).execute({
      ...draftInput,
      summary: "更新後の総括",
    });

    expect(second.getReportId()).toBe(first.getReportId());
    expect(second.getContent().getSummary()).toBe("更新後の総括");
    expect(reportRepository.reports).toHaveLength(1);
  });

  it("担当外の占い師は FORBIDDEN", async () => {
    await expect(
      useCase(createBooking()).execute({
        ...draftInput,
        consultantId: "consultant-2",
      }),
    ).rejects.toThrow(DomainError);
  });

  it("存在しない予約は 404", async () => {
    await expect(
      useCase(createBooking()).execute({
        ...draftInput,
        bookingId: "booking-unknown",
      }),
    ).rejects.toThrow(AppError);
  });

  it("鑑定の終了時刻前は作成できない", async () => {
    await expect(
      useCase(createBooking({ endsAt: FUTURE_ENDS_AT })).execute(draftInput),
    ).rejects.toThrow(DomainError);
  });

  it("キャンセル済みの予約では作成できない", async () => {
    await expect(
      useCase(createBooking({ cancelled: true })).execute(draftInput),
    ).rejects.toThrow(DomainError);
  });

  it("発行後は上書きできない", async () => {
    const booking = createBooking();
    await useCase(booking).execute(draftInput);
    await new PublishAppraisalReportUseCase(
      new InMemoryBookingRepository([booking]),
      reportRepository,
    ).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    await expect(useCase(booking).execute(draftInput)).rejects.toThrow(
      DomainError,
    );
  });
});

describe("PublishAppraisalReportUseCase", () => {
  let reportRepository: InMemoryAppraisalReportRepository;

  beforeEach(() => {
    reportRepository = new InMemoryAppraisalReportRepository();
  });

  function publishUseCase(booking: Booking) {
    return new PublishAppraisalReportUseCase(
      new InMemoryBookingRepository([booking]),
      reportRepository,
    );
  }

  it("下書きを発行できる", async () => {
    const booking = createBooking();
    await new SaveAppraisalReportDraftUseCase(
      new InMemoryBookingRepository([booking]),
      reportRepository,
    ).execute(draftInput);

    const report = await publishUseCase(booking).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    expect(report.isPublished()).toBe(true);
    expect(report.getPublishedAt()).not.toBeNull();
  });

  it("下書きが無ければ 404", async () => {
    await expect(
      publishUseCase(createBooking()).execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        consultantId: CONSULTANT_ID,
      }),
    ).rejects.toThrow(AppError);
  });
});

describe("GetAppraisalReportUseCase", () => {
  it("未作成なら report は null、editable は true", async () => {
    const result = await new GetAppraisalReportUseCase(
      new InMemoryBookingRepository([createBooking()]),
      new InMemoryAppraisalReportRepository(),
    ).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    expect(result.report).toBeNull();
    expect(result.editable).toBe(true);
  });

  it("鑑定の終了時刻前は editable が false", async () => {
    const result = await new GetAppraisalReportUseCase(
      new InMemoryBookingRepository([
        createBooking({ endsAt: FUTURE_ENDS_AT }),
      ]),
      new InMemoryAppraisalReportRepository(),
    ).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    expect(result.editable).toBe(false);
  });

  it("発行済みなら editable が false", async () => {
    const booking = createBooking();
    const reportRepository = new InMemoryAppraisalReportRepository();
    const bookingRepository = new InMemoryBookingRepository([booking]);
    await new SaveAppraisalReportDraftUseCase(
      bookingRepository,
      reportRepository,
    ).execute(draftInput);
    await new PublishAppraisalReportUseCase(
      bookingRepository,
      reportRepository,
    ).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    const result = await new GetAppraisalReportUseCase(
      bookingRepository,
      reportRepository,
    ).execute({
      organizationId: ORGANIZATION_ID,
      bookingId: BOOKING_ID,
      consultantId: CONSULTANT_ID,
    });

    expect(result.report?.isPublished()).toBe(true);
    expect(result.editable).toBe(false);
  });

  it("担当外の占い師は FORBIDDEN", async () => {
    await expect(
      new GetAppraisalReportUseCase(
        new InMemoryBookingRepository([createBooking()]),
        new InMemoryAppraisalReportRepository(),
      ).execute({
        organizationId: ORGANIZATION_ID,
        bookingId: BOOKING_ID,
        consultantId: "consultant-2",
      }),
    ).rejects.toThrow(DomainError);
  });
});
