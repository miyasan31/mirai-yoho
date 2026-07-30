import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { AppraisalReportContent } from "@/domain/appraisal-report/appraisal-report-content";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type AppraisalReportStatus = "draft" | "published";

export interface AppraisalReportCreateProps {
  reportId: string;
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerId: string;
  content: AppraisalReportContent;
}

export interface AppraisalReportReconstructProps
  extends AppraisalReportCreateProps {
  status: AppraisalReportStatus | string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function validateStatus(value: string): AppraisalReportStatus {
  if (value !== "draft" && value !== "published") {
    throw new DomainError(
      "INVALID_APPRAISAL_REPORT_STATUS",
      `Unknown appraisal report status: ${value}`,
    );
  }
  return value;
}

export class AppraisalReport extends AggregateRoot {
  private constructor(
    private readonly reportId: string,
    private readonly organizationId: string,
    private readonly bookingId: string,
    private readonly consultantId: string,
    private readonly customerId: string,
    private content: AppraisalReportContent,
    private status: AppraisalReportStatus,
    private publishedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(props: AppraisalReportCreateProps): AppraisalReport {
    const now = new Date();
    return new AppraisalReport(
      props.reportId,
      props.organizationId,
      props.bookingId,
      props.consultantId,
      props.customerId,
      props.content,
      "draft",
      null,
      now,
      now,
    );
  }

  static reconstruct(props: AppraisalReportReconstructProps): AppraisalReport {
    return new AppraisalReport(
      props.reportId,
      props.organizationId,
      props.bookingId,
      props.consultantId,
      props.customerId,
      props.content,
      validateStatus(props.status),
      props.publishedAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  updateContent(content: AppraisalReportContent): void {
    if (this.status !== "draft") {
      throw new DomainError(
        "APPRAISAL_REPORT_NOT_DRAFT",
        "Published appraisal reports cannot be edited",
      );
    }
    this.content = content;
    this.updatedAt = new Date();
  }

  publish(publishedAt: Date): void {
    if (this.status !== "draft") {
      throw new DomainError(
        "APPRAISAL_REPORT_NOT_DRAFT",
        "Only draft appraisal reports can be published",
      );
    }
    if (!this.content.getResult().trim()) {
      throw new DomainError(
        "APPRAISAL_REPORT_EMPTY_RESULT",
        "Appraisal result is required for publishing",
      );
    }
    this.status = "published";
    this.publishedAt = publishedAt;
    this.updatedAt = publishedAt;
  }

  isPublished(): boolean {
    return this.status === "published";
  }

  getReportId(): string {
    return this.reportId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getConsultantId(): string {
    return this.consultantId;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getContent(): AppraisalReportContent {
    return this.content;
  }

  getStatus(): AppraisalReportStatus {
    return this.status;
  }

  getPublishedAt(): Date | null {
    return this.publishedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
