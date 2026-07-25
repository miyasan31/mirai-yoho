import type { PolicyAgreement } from "@/domain/policy/policy-agreement";
import type {
  PolicyRevision,
  PolicyRevisionStatus,
} from "@/domain/policy/policy-revision";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface PolicyRevisionOutput {
  revisionId: string;
  organizationId: string;
  type: PolicyType;
  version: string;
  title: string;
  body: string;
  status: PolicyRevisionStatus;
  effectiveFrom: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function toPolicyRevisionOutput(
  revision: PolicyRevision,
): PolicyRevisionOutput {
  return {
    revisionId: revision.getRevisionId(),
    organizationId: revision.getOrganizationId(),
    type: revision.getType(),
    version: revision.getVersion(),
    title: revision.getTitle(),
    body: revision.getBody(),
    status: revision.getStatus(),
    effectiveFrom: revision.getEffectiveFrom()?.toISOString() ?? null,
    publishedAt: revision.getPublishedAt()?.toISOString() ?? null,
    archivedAt: revision.getArchivedAt()?.toISOString() ?? null,
    createdBy: revision.getCreatedBy(),
    createdAt: revision.getCreatedAt().toISOString(),
    updatedAt: revision.getUpdatedAt().toISOString(),
  };
}

export interface PolicyAgreementOutput {
  agreementId: string;
  organizationId: string;
  type: PolicyType;
  subjectType: string;
  subjectId: string;
  revisionId: string;
  version: string;
  agreedVia: string;
  bookingId: string | null;
  agreedAt: string;
}

export function toPolicyAgreementOutput(
  agreement: PolicyAgreement,
): PolicyAgreementOutput {
  return {
    agreementId: agreement.getAgreementId(),
    organizationId: agreement.getOrganizationId(),
    type: agreement.getType(),
    subjectType: agreement.getSubjectType(),
    subjectId: agreement.getSubjectId(),
    revisionId: agreement.getRevisionId(),
    version: agreement.getVersion(),
    agreedVia: agreement.getAgreedVia(),
    bookingId: agreement.getBookingId(),
    agreedAt: agreement.getAgreedAt().toISOString(),
  };
}
