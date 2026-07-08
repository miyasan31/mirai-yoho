import { isValidCustomerBirthdateFormat } from "@mirai-yoho/shared/customer-birthdate";
import { DomainError } from "@mirai-yoho/shared/domain-error";

export interface ConsultantMemoProps {
  customerName: string;
  birthDate: string;
  appraisalDate: string;
  freeMemo: string;
}

export class ConsultantMemo {
  private constructor(private readonly props: ConsultantMemoProps) {}

  static create(props: ConsultantMemoProps): ConsultantMemo {
    if (
      props.birthDate !== "" &&
      !isValidCustomerBirthdateFormat(props.birthDate)
    ) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "birthDate must be in YYYY-MM-DD format",
      );
    }
    if (
      props.appraisalDate !== "" &&
      !isValidCustomerBirthdateFormat(props.appraisalDate)
    ) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "appraisalDate must be in YYYY-MM-DD format",
      );
    }
    return new ConsultantMemo({ ...props });
  }

  static reconstruct(props: ConsultantMemoProps): ConsultantMemo {
    return new ConsultantMemo({ ...props });
  }

  static empty(): ConsultantMemo {
    return new ConsultantMemo({
      customerName: "",
      birthDate: "",
      appraisalDate: "",
      freeMemo: "",
    });
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

  getFreeMemo(): string {
    return this.props.freeMemo;
  }

  equals(other: ConsultantMemo): boolean {
    return (
      this.props.customerName === other.props.customerName &&
      this.props.birthDate === other.props.birthDate &&
      this.props.appraisalDate === other.props.appraisalDate &&
      this.props.freeMemo === other.props.freeMemo
    );
  }
}
