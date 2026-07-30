import {
  assertBookingReportable,
  loadOwnedBooking,
} from "@/application/appraisal-report/appraisal-report-booking-guard";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import { AppraisalReport as AppraisalReportEntity } from "@/domain/appraisal-report/appraisal-report";
import { AppraisalReportContent } from "@/domain/appraisal-report/appraisal-report-content";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

interface SaveAppraisalReportDraftInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  title: string;
  customerName: string;
  birthDate: string;
  appraisalDate: string;
  theme: string;
  currentSituation: string;
  result: string;
  luckyAction: string;
  summary: string;
}

export class SaveAppraisalReportDraftUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly appraisalReportRepository: IAppraisalReportRepository,
  ) {}

  async execute(
    input: SaveAppraisalReportDraftInput,
  ): Promise<AppraisalReport> {
    const booking = await loadOwnedBooking(this.bookingRepository, input);
    assertBookingReportable(booking, new Date());

    const content = AppraisalReportContent.create({
      title: input.title,
      customerName: input.customerName,
      birthDate: input.birthDate,
      appraisalDate: input.appraisalDate,
      theme: input.theme,
      currentSituation: input.currentSituation,
      result: input.result,
      luckyAction: input.luckyAction,
      summary: input.summary,
    });

    const existing = await this.appraisalReportRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );

    // 予約 1 件につき鑑定書は 1 通。既にあれば上書き、無ければ新規作成する
    const report =
      existing ??
      AppraisalReportEntity.create({
        reportId: crypto.randomUUID(),
        organizationId: input.organizationId,
        bookingId: input.bookingId,
        consultantId: booking.getConsultantId(),
        customerId: booking.getCustomerId(),
        content,
      });
    if (existing) {
      existing.updateContent(content);
    }

    await this.appraisalReportRepository.save(report);
    return report;
  }
}
