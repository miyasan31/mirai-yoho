import { diffLines } from "diff";
import { AppError } from "@/application/shared/app-error";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";

export interface GetPolicyDiffInput {
  organizationId: string;
  fromRevisionId: string | null;
  toRevisionId: string;
}

export interface PolicyDiffChunk {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface PolicyDiffOutput {
  fromRevisionId: string | null;
  fromVersion: string | null;
  toRevisionId: string;
  toVersion: string;
  chunks: PolicyDiffChunk[];
}

export class GetPolicyDiffUseCase {
  constructor(
    private readonly policyRevisionRepository: IPolicyRevisionRepository,
  ) {}

  async execute(input: GetPolicyDiffInput): Promise<PolicyDiffOutput> {
    const to = await this.policyRevisionRepository.findById(input.toRevisionId);
    if (!to || to.getOrganizationId() !== input.organizationId) {
      throw new AppError(
        404,
        "POLICY_REVISION_NOT_FOUND",
        "Target policy revision not found",
      );
    }

    let fromBody = "";
    let fromVersion: string | null = null;
    let fromId: string | null = null;
    if (input.fromRevisionId) {
      const from = await this.policyRevisionRepository.findById(
        input.fromRevisionId,
      );
      if (
        !from ||
        from.getOrganizationId() !== input.organizationId ||
        from.getType() !== to.getType()
      ) {
        throw new AppError(
          404,
          "POLICY_REVISION_NOT_FOUND",
          "Base policy revision not found",
        );
      }
      fromBody = from.getBody();
      fromVersion = from.getVersion();
      fromId = from.getRevisionId();
    }

    const parts = diffLines(fromBody, to.getBody());
    return {
      fromRevisionId: fromId,
      fromVersion,
      toRevisionId: to.getRevisionId(),
      toVersion: to.getVersion(),
      chunks: parts.map((p) => ({
        value: p.value,
        added: Boolean(p.added),
        removed: Boolean(p.removed),
      })),
    };
  }
}
