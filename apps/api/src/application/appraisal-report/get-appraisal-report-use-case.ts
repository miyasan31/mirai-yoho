import {
  isBookingReportable,
  loadOwnedBooking,
} from "@/application/appraisal-report/appraisal-report-booking-guard";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import type { Booking } from "@/domain/booking/booking";
import type { IBookingRepository } from "@/domain/booking/booking-repository";

interface GetAppraisalReportInput {
  organizationId: string;
  bookingId: string;
  consultantId: string;
}

export interface GetAppraisalReportOutput {
  booking: Booking;
  report: AppraisalReport | null;
  /** 下書き保存・発行を受け付けられる状態か（鑑定終了済み・未キャンセル・未発行） */
  editable: boolean;
}

export class GetAppraisalReportUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly appraisalReportRepository: IAppraisalReportRepository,
  ) {}

  async execute(
    input: GetAppraisalReportInput,
  ): Promise<GetAppraisalReportOutput> {
    const booking = await loadOwnedBooking(this.bookingRepository, input);
    const report = await this.appraisalReportRepository.findByBookingId(
      input.organizationId,
      input.bookingId,
    );
    return {
      booking,
      report,
      editable:
        isBookingReportable(booking, new Date()) && !report?.isPublished(),
    };
  }
}
