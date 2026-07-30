import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";

export interface IAppraisalReportRepository {
  findById(
    organizationId: string,
    reportId: string,
  ): Promise<AppraisalReport | null>;
  findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<AppraisalReport | null>;
  findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<AppraisalReport[]>;
  /** 組織横断。顧客マイページ用に発行済みの鑑定書だけを返す */
  findPublishedByCustomerIds(customerIds: string[]): Promise<AppraisalReport[]>;
  save(report: AppraisalReport): Promise<void>;
}
