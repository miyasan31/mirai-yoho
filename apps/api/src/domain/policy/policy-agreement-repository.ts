import type {
  PolicyAgreement,
  PolicySubjectType,
} from "@/domain/policy/policy-agreement";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface IPolicyAgreementRepository {
  save(agreement: PolicyAgreement): Promise<void>;
  findLatestBySubject(
    organizationId: string,
    subjectType: PolicySubjectType,
    subjectId: string,
    type: PolicyType,
  ): Promise<PolicyAgreement | null>;
  listBySubject(
    organizationId: string,
    subjectType: PolicySubjectType,
    subjectId: string,
  ): Promise<PolicyAgreement[]>;
}
