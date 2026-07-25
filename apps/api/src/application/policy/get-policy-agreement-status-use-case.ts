import type { PolicyRevisionOutput } from "@/application/policy/policy-output";
import { toPolicyRevisionOutput } from "@/application/policy/policy-output";
import type {
  PolicyAgreementVia,
  PolicySubjectType,
} from "@/domain/policy/policy-agreement";
import type { IPolicyAgreementRepository } from "@/domain/policy/policy-agreement-repository";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import { POLICY_TYPES, type PolicyType } from "@/domain/policy/policy-type";

export interface GetPolicyAgreementStatusInput {
  organizationId: string;
  subjectType: PolicySubjectType;
  subjectId: string;
  at?: Date;
}

export interface PolicyAgreementStatusEntry {
  type: PolicyType;
  latestRevision: PolicyRevisionOutput | null;
  latestAgreedRevisionId: string | null;
  latestAgreedVersion: string | null;
  latestAgreedAt: string | null;
  latestAgreedVia: PolicyAgreementVia | null;
  needsAgreement: boolean;
}

export interface PolicyAgreementStatusOutput {
  organizationId: string;
  subjectType: PolicySubjectType;
  subjectId: string;
  entries: PolicyAgreementStatusEntry[];
  needsReagreement: boolean;
}

export class GetPolicyAgreementStatusUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
    private readonly policyAgreementRepository: IPolicyAgreementRepository,
  ) {}

  async execute(
    input: GetPolicyAgreementStatusInput,
  ): Promise<PolicyAgreementStatusOutput> {
    const at = input.at ?? new Date();
    const entries: PolicyAgreementStatusEntry[] = await Promise.all(
      POLICY_TYPES.map(async (type) => {
        const [revision, agreement] = await Promise.all([
          this.policyRevisionRepository.findLatestPublished(
            input.organizationId,
            type,
            at,
          ),
          this.policyAgreementRepository.findLatestBySubject(
            input.organizationId,
            input.subjectType,
            input.subjectId,
            type,
          ),
        ]);

        const latestRevision = revision
          ? toPolicyRevisionOutput(revision)
          : null;
        const needsAgreement = Boolean(
          latestRevision &&
            (agreement === null ||
              agreement.getRevisionId() !== latestRevision.revisionId),
        );

        return {
          type,
          latestRevision,
          latestAgreedRevisionId: agreement?.getRevisionId() ?? null,
          latestAgreedVersion: agreement?.getVersion() ?? null,
          latestAgreedAt: agreement?.getAgreedAt().toISOString() ?? null,
          latestAgreedVia: agreement?.getAgreedVia() ?? null,
          needsAgreement,
        };
      }),
    );

    return {
      organizationId: input.organizationId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      entries,
      needsReagreement: entries.some((entry) => entry.needsAgreement),
    };
  }
}
