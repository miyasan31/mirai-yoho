import {
  type PolicyRevisionOutput,
  toPolicyRevisionOutput,
} from "@/application/policy/policy-output";
import { AppError } from "@/application/shared/app-error";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";

export interface UpdatePolicyRevisionDraftInput {
  organizationId: string;
  revisionId: string;
  version?: string;
  title?: string;
  body?: string;
}

export class UpdatePolicyRevisionDraftUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(
    input: UpdatePolicyRevisionDraftInput,
  ): Promise<PolicyRevisionOutput> {
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

    if (input.version !== undefined) {
      const siblings =
        await this.policyRevisionRepository.listByOrganizationAndType(
          revision.getOrganizationId(),
          revision.getType(),
        );
      const trimmed = input.version.trim();
      const versionCollision = siblings.some(
        (r) =>
          r.getRevisionId() !== revision.getRevisionId() &&
          r.getVersion() === trimmed,
      );
      if (versionCollision) {
        throw new AppError(
          409,
          "POLICY_VERSION_ALREADY_EXISTS",
          `Policy version "${input.version}" already exists for this organization and type`,
        );
      }
    }

    revision.updateDraft({
      version: input.version,
      title: input.title,
      body: input.body,
    });

    await this.policyRevisionRepository.save(revision);
    return toPolicyRevisionOutput(revision);
  }
}
