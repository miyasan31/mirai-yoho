import {
  type PolicyAgreementOutput,
  toPolicyAgreementOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import {
  PolicyAgreement,
  type PolicyAgreementVia,
  type PolicySubjectType,
} from "@/domain/policy/policy-agreement";
import type { IPolicyAgreementRepository } from "@/domain/policy/policy-agreement-repository";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface RecordPolicyAgreementItem {
  type: PolicyType;
  revisionId: string;
}

export interface RecordPolicyAgreementInput {
  organizationId: string;
  subjectType: PolicySubjectType;
  subjectId: string;
  agreedVia: PolicyAgreementVia;
  items: RecordPolicyAgreementItem[];
  bookingId?: string | null;
  agreedAt?: Date;
}

export class RecordPolicyAgreementUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
    private readonly policyAgreementRepository: IPolicyAgreementRepository,
  ) {}

  async execute(
    input: RecordPolicyAgreementInput,
  ): Promise<PolicyAgreementOutput[]> {
    if (input.items.length === 0) {
      throw new AppError(
        400,
        "POLICY_AGREEMENT_EMPTY",
        "At least one policy item must be specified",
      );
    }

    const agreedAt = input.agreedAt ?? new Date();
    const outputs: PolicyAgreementOutput[] = [];

    for (const item of input.items) {
      const revision = await this.policyRevisionRepository.findById(
        item.revisionId,
      );
      if (
        !revision ||
        revision.getOrganizationId() !== input.organizationId ||
        revision.getType() !== item.type
      ) {
        throw new AppError(
          404,
          "POLICY_REVISION_NOT_FOUND",
          `Policy revision ${item.revisionId} not found for type ${item.type}`,
        );
      }
      if (!revision.isPublished()) {
        throw new AppError(
          400,
          "POLICY_REVISION_NOT_PUBLISHED",
          `Policy revision ${item.revisionId} is not published`,
        );
      }

      const agreement = PolicyAgreement.create({
        agreementId: crypto.randomUUID(),
        organizationId: input.organizationId,
        type: item.type,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        revisionId: revision.getRevisionId(),
        version: revision.getVersion(),
        agreedVia: input.agreedVia,
        bookingId: input.bookingId ?? null,
        agreedAt,
      });

      await this.policyAgreementRepository.save(agreement);
      outputs.push(toPolicyAgreementOutput(agreement));
    }

    return outputs;
  }
}
