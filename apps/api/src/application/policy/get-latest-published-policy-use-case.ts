import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface GetLatestPublishedPolicyInput {
  organizationId: string;
  type: PolicyType;
  at?: Date;
}

export interface GetLatestPublishedPolicyOutput {
  revision: PolicyRevisionOutput | null;
}

export class GetLatestPublishedPolicyUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: GetLatestPublishedPolicyInput,
  ): Promise<GetLatestPublishedPolicyOutput> {
    const at = input.at ?? new Date();
    const revision = await this.policyRevisionRepository.findLatestPublished(
      input.organizationId,
      input.type,
      at,
    );
    return { revision: revision ? toPolicyRevisionOutput(revision) : null };
  }
}
