import { DomainError } from "@mirai-yoho/shared/domain-error";
import {
  type PolicyType,
  validatePolicyType,
} from "@/domain/policy/policy-type";
import { AggregateRoot } from "@/domain/shared/aggregate-root";

export type PolicySubjectType = "user" | "customer";

export type PolicyAgreementVia =
  | "booking"
  | "reagreement_modal"
  | "registration";

const SUBJECT_TYPES: readonly PolicySubjectType[] = [
  "user",
  "customer",
] as const;

const AGREEMENT_VIA_VALUES: readonly PolicyAgreementVia[] = [
  "booking",
  "reagreement_modal",
  "registration",
] as const;

function validateSubjectType(value: string): PolicySubjectType {
  if (!SUBJECT_TYPES.includes(value as PolicySubjectType)) {
    throw new DomainError(
      "INVALID_POLICY_SUBJECT_TYPE",
      `Unknown subject type: ${value}`,
    );
  }
  return value as PolicySubjectType;
}

function validateAgreementVia(value: string): PolicyAgreementVia {
  if (!AGREEMENT_VIA_VALUES.includes(value as PolicyAgreementVia)) {
    throw new DomainError(
      "INVALID_POLICY_AGREEMENT_VIA",
      `Unknown agreement via: ${value}`,
    );
  }
  return value as PolicyAgreementVia;
}

function validateRequiredString(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError("INVALID_POLICY_AGREEMENT", `${field} is required`);
  }
  return normalized;
}

export interface PolicyAgreementCreateProps {
  agreementId: string;
  organizationId: string;
  type: PolicyType | string;
  subjectType: PolicySubjectType | string;
  subjectId: string;
  revisionId: string;
  version: string;
  agreedVia: PolicyAgreementVia | string;
  bookingId?: string | null;
  agreedAt?: Date;
}

export interface PolicyAgreementReconstructProps {
  agreementId: string;
  organizationId: string;
  type: PolicyType | string;
  subjectType: PolicySubjectType | string;
  subjectId: string;
  revisionId: string;
  version: string;
  agreedVia: PolicyAgreementVia | string;
  bookingId: string | null;
  agreedAt: Date;
}

export class PolicyAgreement extends AggregateRoot {
  private constructor(
    private readonly agreementId: string,
    private readonly organizationId: string,
    private readonly type: PolicyType,
    private readonly subjectType: PolicySubjectType,
    private readonly subjectId: string,
    private readonly revisionId: string,
    private readonly version: string,
    private readonly agreedVia: PolicyAgreementVia,
    private readonly bookingId: string | null,
    private readonly agreedAt: Date,
  ) {
    super();
  }

  static create(props: PolicyAgreementCreateProps): PolicyAgreement {
    return new PolicyAgreement(
      validateRequiredString(props.agreementId, "agreementId"),
      validateRequiredString(props.organizationId, "organizationId"),
      validatePolicyType(props.type),
      validateSubjectType(props.subjectType),
      validateRequiredString(props.subjectId, "subjectId"),
      validateRequiredString(props.revisionId, "revisionId"),
      validateRequiredString(props.version, "version"),
      validateAgreementVia(props.agreedVia),
      props.bookingId ?? null,
      props.agreedAt ?? new Date(),
    );
  }

  static reconstruct(props: PolicyAgreementReconstructProps): PolicyAgreement {
    return new PolicyAgreement(
      props.agreementId,
      props.organizationId,
      validatePolicyType(props.type),
      validateSubjectType(props.subjectType),
      props.subjectId,
      props.revisionId,
      props.version,
      validateAgreementVia(props.agreedVia),
      props.bookingId,
      props.agreedAt,
    );
  }

  getAgreementId(): string {
    return this.agreementId;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getType(): PolicyType {
    return this.type;
  }

  getSubjectType(): PolicySubjectType {
    return this.subjectType;
  }

  getSubjectId(): string {
    return this.subjectId;
  }

  getRevisionId(): string {
    return this.revisionId;
  }

  getVersion(): string {
    return this.version;
  }

  getAgreedVia(): PolicyAgreementVia {
    return this.agreedVia;
  }

  getBookingId(): string | null {
    return this.bookingId;
  }

  getAgreedAt(): Date {
    return this.agreedAt;
  }
}
