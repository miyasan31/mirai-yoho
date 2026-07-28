import { DomainError } from "@mirai-yoho/shared/domain-error";

export interface CompanyInfoProps {
  /** 精算書の宛先として記載する運営会社名 */
  companyName: string;
  /** 運営会社の所在地 */
  address: string;
  /** 「事務所を住所として利用」した占い師の住所として記載する事務所所在地 */
  officeAddress: string;
}

const MAX_COMPANY_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 200;

export class CompanyInfo {
  private constructor(
    private readonly companyName: string,
    private readonly address: string,
    private readonly officeAddress: string,
  ) {}

  static create(props: CompanyInfoProps): CompanyInfo {
    const companyName = props.companyName.trim();
    const address = props.address.trim();
    const officeAddress = props.officeAddress.trim();

    if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
      throw new DomainError(
        "INVALID_COMPANY_INFO",
        `Company name must be ${MAX_COMPANY_NAME_LENGTH} characters or fewer`,
      );
    }
    if (
      address.length > MAX_ADDRESS_LENGTH ||
      officeAddress.length > MAX_ADDRESS_LENGTH
    ) {
      throw new DomainError(
        "INVALID_COMPANY_INFO",
        `Address must be ${MAX_ADDRESS_LENGTH} characters or fewer`,
      );
    }

    return new CompanyInfo(companyName, address, officeAddress);
  }

  static createDefault(): CompanyInfo {
    return new CompanyInfo("", "", "");
  }

  static reconstruct(props: CompanyInfoProps): CompanyInfo {
    return new CompanyInfo(
      props.companyName,
      props.address,
      props.officeAddress,
    );
  }

  getCompanyName(): string {
    return this.companyName;
  }

  getAddress(): string {
    return this.address;
  }

  getOfficeAddress(): string {
    return this.officeAddress;
  }

  toJSON(): CompanyInfoProps {
    return {
      companyName: this.companyName,
      address: this.address,
      officeAddress: this.officeAddress,
    };
  }
}
