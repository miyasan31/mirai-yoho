import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface ListPolicyRevisionsInput {
  organizationId: string;
  type: PolicyType;
}

export class ListPolicyRevisionsUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: ListPolicyRevisionsInput,
  ): Promise<PolicyRevisionOutput[]> {
    const revisions =
      await this.policyRevisionRepository.listByOrganizationAndType(
        input.organizationId,
        input.type,
      );
    return revisions.map(toPolicyRevisionOutput);
  }
}
