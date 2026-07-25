import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import { PolicyRevision } from "@/domain/policy/policy-revision";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";

export interface CreatePolicyRevisionDraftInput {
  organizationId: string;
  type: PolicyType;
  version: string;
  title: string;
  body: string;
  createdBy: string;
}

export class CreatePolicyRevisionDraftUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: CreatePolicyRevisionDraftInput,
  ): Promise<PolicyRevisionOutput> {
    const existing =
      await this.policyRevisionRepository.listByOrganizationAndType(
        input.organizationId,
        input.type,
      );
    const versionCollision = existing.some(
      (r) => r.getVersion() === input.version.trim(),
    );
    if (versionCollision) {
      throw new AppError(
        409,
        "POLICY_VERSION_ALREADY_EXISTS",
        `Policy version "${input.version}" already exists for this organization and type`,
      );
    }

    const revision = PolicyRevision.create({
      revisionId: crypto.randomUUID(),
      organizationId: input.organizationId,
      type: input.type,
      version: input.version,
      title: input.title,
      body: input.body,
      createdBy: input.createdBy,
    });

    await this.policyRevisionRepository.save(revision);
    return toPolicyRevisionOutput(revision);
  }
}
