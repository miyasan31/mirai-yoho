import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";

export interface GetPolicyRevisionInput {
  organizationId: string;
  revisionId: string;
}

export class GetPolicyRevisionUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(input: GetPolicyRevisionInput): Promise<PolicyRevisionOutput> {
    const revision = await this.policyRevisionRepository.findById(
      input.revisionId,
    );
    if (!revision || revision.getOrganizationId() !== input.organizationId) {
      throw new AppError(
        404,
        "POLICY_REVISION_NOT_FOUND",
        "Policy revision not found",
      );
    }
    return toPolicyRevisionOutput(revision);
  }
}
