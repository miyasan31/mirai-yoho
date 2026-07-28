import {
  assertBookingReportable,
  loadOwnedBooking,
} from "@/application/appraisal-report/appraisal-report-booking-guard";
import { AppError } from "@/application/shared/app-error";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

interface PublishAppraisalReportInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
}

export class PublishAppraisalReportUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly appraisalReportRepository: IAppraisalReportRepository,
  ) {}

  async execute(input: PublishAppraisalReportInput): Promise<AppraisalReport> {
    const booking = await loadOwnedBooking(this.bookingRepository, input);
    assertBookingReportable(booking, new Date());

    const report = await this.appraisalReportRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );
    if (!report) {
      throw new AppError(
        404,
        "APPRAISAL_REPORT_NOT_FOUND",
        "Appraisal report not found",
      );
    }

    report.publish(new Date());
    await this.appraisalReportRepository.save(report);
    return report;
  }
}
