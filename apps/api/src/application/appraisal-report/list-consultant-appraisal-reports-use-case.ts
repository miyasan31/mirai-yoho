import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";

interface ListConsultantAppraisalReportsInput {
  organizationId: string;
  consultantId: string;
}

export class ListConsultantAppraisalReportsUseCase {
  constructor(
    private readonly appraisalReportRepository: IAppraisalReportRepository,
  ) {}

  async execute(
    input: ListConsultantAppraisalReportsInput,
  ): Promise<AppraisalReport[]> {
    return this.appraisalReportRepository.findByConsultantId(
      input.organizationId,
      input.consultantId,
    );
  }
}
