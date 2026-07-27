import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface GetLatestPublishedPolicyInput {
  organizationId: string;
  type: PolicyType;
  at?: Date;
}

export class GetLatestPublishedPolicyUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: GetLatestPublishedPolicyInput,
  ): Promise<PolicyRevisionOutput> {
    const at = input.at ?? new Date();
    const revision = await this.policyRevisionRepository.findLatestPublished(
      input.organizationId,
      input.type,
      at,
    );
    if (!revision) {
      throw new AppError(
        404,
        "POLICY_NOT_PUBLISHED",
        `No published ${input.type} policy for organization ${input.organizationId}`,
      );
    }
    return toPolicyRevisionOutput(revision);
  }
}
