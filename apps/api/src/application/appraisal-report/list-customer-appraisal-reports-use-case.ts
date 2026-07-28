import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import type { IConsultantRepository } from "@/domain/consultant/consultant-repository";
import type { ICustomerRepository } from "@/domain/customer/customer-repository";
import type { IOrganizationRepository } from "@/domain/organization/organization-repository";

interface ListCustomerAppraisalReportsInput {
  userId: string;
}

export interface CustomerAppraisalReportResult {
  report: AppraisalReport;
  consultantName: string | null;
  organizationName: string | null;
}

export class ListCustomerAppraisalReportsUseCase {
  constructor(
    private readonly appraisalReportRepository: IAppraisalReportRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly consultantRepository: IConsultantRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(
    input: ListCustomerAppraisalReportsInput,
  ): Promise<CustomerAppraisalReportResult[]> {
    const customers = await this.customerRepository.findByUserId(input.userId);
    if (customers.length === 0) {
      return [];
    }

    const reports =
      await this.appraisalReportRepository.findPublishedByCustomerIds(
        customers.map((customer) => customer.getCustomerId()),
      );
    if (reports.length === 0) {
      return [];
    }

    const consultantIdsByOrganization = new Map<string, Set<string>>();
    for (const report of reports) {
      const orgId = report.getOrganizationId();
      const set = consultantIdsByOrganization.get(orgId) ?? new Set<string>();
      set.add(report.getConsultantId());
      consultantIdsByOrganization.set(orgId, set);
    }

    const [organizations, consultantsByOrg] = await Promise.all([
      this.organizationRepository.findByIds([
        ...consultantIdsByOrganization.keys(),
      ]),
      Promise.all(
        [...consultantIdsByOrganization.entries()].map(
          async ([orgId, consultantIdSet]) =>
            [
              orgId,
              await this.consultantRepository.findByIds(orgId, [
                ...consultantIdSet,
              ]),
            ] as const,
        ),
      ),
    ]);

    const consultantNameByKey = new Map<string, string | null>();
    for (const [orgId, consultants] of consultantsByOrg) {
      for (const consultant of consultants) {
        consultantNameByKey.set(
          `${orgId}::${consultant.getConsultantId()}`,
          consultant.getProfile().getDisplayName(),
        );
      }
    }

    const organizationNameById = new Map(
      organizations.map((org) => [org.getOrganizationId(), org.getName()]),
    );

    return reports.map((report) => ({
      report,
      consultantName:
        consultantNameByKey.get(
          `${report.getOrganizationId()}::${report.getConsultantId()}`,
        ) ?? null,
      organizationName:
        organizationNameById.get(report.getOrganizationId()) ?? null,
    }));
  }
}
