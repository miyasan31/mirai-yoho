import { isValidCustomerBirthdateFormat } from "@mirai-yoho/shared/customer-birthdate";
import { DomainError } from "@mirai-yoho/shared/domain-error";

const TITLE_MAX_LENGTH = 120;
const NAME_MAX_LENGTH = 120;
const SECTION_MAX_LENGTH = 10_000;

export interface AppraisalReportContentProps {
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

function validateLength(value: string, maxLength: number, label: string): void {
  if (value.length > maxLength) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${label} must be ${maxLength} characters or less`,
    );
  }
}

function validateDate(value: string, label: string): void {
  if (value !== "" && !isValidCustomerBirthdateFormat(value)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${label} must be in YYYY-MM-DD format`,
    );
  }
}

export class AppraisalReportContent {
  private constructor(private readonly props: AppraisalReportContentProps) {}

  static create(props: AppraisalReportContentProps): AppraisalReportContent {
    validateLength(props.title, TITLE_MAX_LENGTH, "title");
    validateLength(props.customerName, NAME_MAX_LENGTH, "customerName");
    validateDate(props.birthDate, "birthDate");
    validateDate(props.appraisalDate, "appraisalDate");
    validateLength(props.theme, SECTION_MAX_LENGTH, "theme");
    validateLength(
      props.currentSituation,
      SECTION_MAX_LENGTH,
      "currentSituation",
    );
    validateLength(props.result, SECTION_MAX_LENGTH, "result");
    validateLength(props.luckyAction, SECTION_MAX_LENGTH, "luckyAction");
    validateLength(props.summary, SECTION_MAX_LENGTH, "summary");
    return new AppraisalReportContent({ ...props });
  }

  static reconstruct(
    props: AppraisalReportContentProps,
  ): AppraisalReportContent {
    return new AppraisalReportContent({ ...props });
  }

  static empty(): AppraisalReportContent {
    return new AppraisalReportContent({
      title: "",
      customerName: "",
      birthDate: "",
      appraisalDate: "",
      theme: "",
      currentSituation: "",
      result: "",
      luckyAction: "",
      summary: "",
    });
  }

  getTitle(): string {
    return this.props.title;
  }

  getCustomerName(): string {
    return this.props.customerName;
  }

  getBirthDate(): string {
    return this.props.birthDate;
  }

  getAppraisalDate(): string {
    return this.props.appraisalDate;
  }

  getTheme(): string {
    return this.props.theme;
  }

  getCurrentSituation(): string {
    return this.props.currentSituation;
  }

  getResult(): string {
    return this.props.result;
  }

  getLuckyAction(): string {
    return this.props.luckyAction;
  }

  getSummary(): string {
    return this.props.summary;
  }

  equals(other: AppraisalReportContent): boolean {
    return (
      this.props.title === other.props.title &&
      this.props.customerName === other.props.customerName &&
      this.props.birthDate === other.props.birthDate &&
      this.props.appraisalDate === other.props.appraisalDate &&
      this.props.theme === other.props.theme &&
      this.props.currentSituation === other.props.currentSituation &&
      this.props.result === other.props.result &&
      this.props.luckyAction === other.props.luckyAction &&
      this.props.summary === other.props.summary
    );
  }
}
